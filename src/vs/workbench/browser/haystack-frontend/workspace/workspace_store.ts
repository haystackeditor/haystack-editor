/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from "vs/base/common/uri"
import { Rectangle } from "vs/workbench/browser/haystack-frontend/canvas/rectangle"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { setTrackChanges } from "vs/workbench/browser/haystack-frontend/canvas_utils/set_track_changes"
import {
  CanvasCodeEditor,
  CanvasDiffEditor,
  CanvasEditor,
  CanvasEditorType,
  CanvasGhostEditor,
  CanvasMergeEditor,
  CanvasModalEditor,
  CanvasReferencesEditor,
  DEFAULT_DIFF_EDITOR_WIDTH,
  DEFAULT_EDITOR_HEIGHT,
  DEFAULT_EDITOR_WIDTH,
  EMPTY_EDITOR_HEIGHT,
  MIN_EDITOR_HEIGHT,
  MIN_EDITOR_WIDTH,
} from "vs/workbench/browser/haystack-frontend/editor/editor"
import {
  getCenterOfCanvas,
  getUpperLeftQuadrantViewport,
  getViewportDimensionsWithPadding,
  navigateToPosition,
  transformFromViewportToCanvas,
} from "vs/workbench/browser/haystack-frontend/mirror/react_to_pixi"
import * as uuid from "vs/base/common/uuid"
import { IRange, Range } from "vs/editor/common/core/range"
import {
  createStore,
  StateCreator,
  StoreMutatorIdentifier,
} from "zustand/vanilla"

import { HEADER_HEIGHT } from "vs/workbench/browser/haystack-frontend/editor/editor_header"
import { devtools } from "zustand/middleware"
import type { HaystackService } from "vs/workbench/services/haystack/browser/haystackService"
import { IEditorOptions } from "vs/platform/editor/common/editor"
import { IEditorIdentifier, IEditorPane } from "vs/workbench/common/editor"
import { SymbolKind } from "vs/editor/common/languages"
import { EditorOpenArgs } from "vs/workbench/services/haystack/common/haystackService"
import {
  RendererManager,
  VIEWPORT_PADDING,
} from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import {
  ChangeQueueItem,
  FinalEditorArgs,
  LINE_HEIGHT,
  EditorArgs,
  CodeEditorArgs,
  WorkspaceState,
  getSizeForEditor,
  getSizeForEditorWithScale,
  isSymbolEditorType,
} from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { middlewareManager } from "../middleware/middleware"
import { DeferredPromise } from "vs/base/common/async"
import { getWindow } from "vs/base/browser/dom"
import { clamp } from "vs/base/common/numbers"
import {
  NavigationType,
  SymbolDepsType,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import { CanvasWorkspace } from "vs/workbench/services/haystack/browser/canvasWorkspaceCommon"
import { ConfirmResult } from "vs/platform/dialogs/common/dialogs"
import { commitAction } from "vs/workbench/browser/haystack-frontend/canvas_utils/commit_action"
import { ReferencesController } from "vs/editor/contrib/gotoSymbol/browser/peek/referencesController"
import {
  appContainerRef,
  canvasRef,
} from "vs/workbench/browser/haystack-frontend/root/app_common"
import { WebviewInput } from "vs/workbench/contrib/webviewPanel/browser/webviewEditorInput"
import { HaystackTelemetryService } from "vs/workbench/services/haystackTelemetry/browser/haystackTelemetryService"
import { convertStateToEvent } from "vs/workbench/browser/haystack-frontend/middleware/state_event"
import { MiddlewareType } from "vs/workbench/browser/haystack-frontend/middleware/middleware_common"
import { SpatialSortMiddleware } from "vs/workbench/browser/haystack-frontend/middleware/spatial_sort_middleware"
import { ExtensionsInput } from "vs/workbench/contrib/extensions/common/extensionsInput"

// This exists here because otherwise it causes weird reference errors.
type Middleware = <
  T extends unknown,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  f: StateCreator<T, Mps, Mcs>,
) => StateCreator<T, Mps, Mcs>

type MiddlewareImpl = <T extends unknown>(
  f: StateCreator<T, [], []>,
) => StateCreator<T, [], []>

const middlewareImpl: MiddlewareImpl = (f) => (set, get, store) => {
  const observedSet: typeof set = (...a) => {
    for (const element of a) {
      if (
        typeof element === "object" &&
        !Array.isArray(element) &&
        element !== null
      ) {
        for (const [stateKey, newVal] of Object.entries(element)) {
          for (const middleware of middlewareManager.registeredMiddleware) {
            const previousVal = get()[stateKey as keyof typeof get]
            const stateEvent = convertStateToEvent(
              stateKey,
              previousVal,
              newVal,
            )
            if (stateEvent != null) {
              middleware.handleStoreChange(stateEvent)
            }
          }
        }
      }
    }
    set(...a)
  }
  store.setState = observedSet

  return f(observedSet, get, store)
}

const middleware = middlewareImpl as unknown as Middleware

export function getWorkspaceStore() {
  return createStore<WorkspaceState>()(
    devtools(
      middleware((set, get) => ({
        canvasCamera: Vector.new(),
        canvasScale: 1.0,
        idToEditorMap: new Map(),
        sourceToGhosteditorIdMultiMap: new Map(),
        modelIdtoEditorIdMap: new Map(),
        filePathToEditedRange: new Map(),
        editorIdToOriginalEditor: new Map(),
        selection: new Set(),
        editorToFocus: "",
        symbolIdToModelMap: new Map(),
        filePathToModelMap: new Map(),
        fileIdChangeQueue: new Array<ChangeQueueItem>(),
        symbolIdChangeQueue: new Array<ChangeQueueItem>(),
        filePathToDiagnostics: new Map(),
        filePathToDiagnosticRowOffset: new Map(),
        isMakingBypassingEdits: false as boolean,
        filePathToEditorMap: new Map(),
        symbolIdToEditorMap: new Map(),
        haystackService: null as HaystackService | null,
        haystackTelemetryService: null as HaystackTelemetryService | null,
        openEditors: new Set(),
        maxZIndex: 3,
        haystackServiceIsInitialized: new DeferredPromise(),
        haystackTelemetryServiceIsInitialized: new DeferredPromise(),
        ghostEditorSets: [] as Set<string>[],
        sortedEditors: [] as CanvasEditor[],
        isHoldingModifier: false as boolean,
        isHoldingOptAlt: false as boolean,
        focusedEditorId: null as string | null,
        canvasWorkspaces: [] as CanvasWorkspace[],
        currentCanvasWorkspace: null as CanvasWorkspace | null,
        canvasWorkspaceIsDirty: false as boolean,
        showNavigationBar: true as boolean,
        openAiSettings: {
          apiKey: null as string | null,
          organizationid: null as string | null,
          endpoint: null as string | null,
        },
        previousEditorHistoryStack: [] as (string | null)[],
        nextEditorHistoryStack: [] as (string | null)[],
        floatingToolbarElement: null as HTMLElement | null,
        previousEditorSelectionHistoryMap: new Map(),
        nextEditorSelectionHistoryMap: new Map(),
        getEditorPosition: (editorId: string, idToEditorMap) => {
          const editor = idToEditorMap
            ? idToEditorMap.get(editorId)
            : get().idToEditorMap.get(editorId)
          if (editor == null) return Vector.new()
          // We round here to avoid bad AA behavior (which makes the editors blurred.)
          return editor.isPinned
            ? new Vector(editor.vxPosition, editor.vyPosition)
            : Vector.add(
              get().canvasCamera,
              new Vector(editor.xPosition, editor.yPosition),
            ).round()
        },
        addModel: (modelId: string, editorId: string) => {
          const editortoEditorIdMap = new Map(get().modelIdtoEditorIdMap)
          editortoEditorIdMap.set(modelId, editorId)
          set({ modelIdtoEditorIdMap: editortoEditorIdMap })
        },
        removeModel: (modelId: string) => {
          const editortoEditorIdMap = new Map(get().modelIdtoEditorIdMap)
          editortoEditorIdMap.delete(modelId)
          set({ modelIdtoEditorIdMap: editortoEditorIdMap })
        },
        getEditorFromModelId: (modelId: string) => {
          const editorId = get().modelIdtoEditorIdMap.get(modelId)
          if (editorId == null) return null
          const editor = get().idToEditorMap.get(editorId)
          if (editor == null) return null
          return editor
        },
        createReferencesEditor(referencesModel, codeEditor, range) {
          const idToEditorMap = new Map(get().idToEditorMap)
          let fromEditor: CanvasEditor | undefined = undefined
          for (const editor of idToEditorMap.values()) {
            if (
              editor.type !== CanvasEditorType.CODE_EDITOR &&
              editor.type !== CanvasEditorType.DIFF_EDITOR &&
              editor.type !== CanvasEditorType.GHOST_EDITOR
            ) {
              continue
            }

            const resource =
              editor.type === CanvasEditorType.DIFF_EDITOR
                ? editor.modifiedUri
                : editor.uri
            if (
              resource.toString() === codeEditor.getModel()?.uri.toString() &&
              Range.equalsRange(editor.editRange, codeEditor.getEditRange())
            ) {
              fromEditor = editor
              break
            }
          }

          if (fromEditor == null) return

          const editorId = uuid.generateUuid()

          const centerOfViewport = getCenterOfCanvas()
          const upperLeftOfViewport = getUpperLeftQuadrantViewport()

          const resizer = document.getElementById(
            "pixi-resizer",
          ) as HTMLDivElement
          const canvasBoundingBox = resizer.getBoundingClientRect()

          const originalEditorPositionY =
            get().getEditorPosition(fromEditor.uuid).y + canvasBoundingBox.y

          const showAtBottom =
            codeEditor.getPosition() == null
              ? true
              : originalEditorPositionY +
              codeEditor.getTopForLineNumber(
                codeEditor.getPosition()!.lineNumber,
              ) -
              codeEditor.getScrollTop() <=
              centerOfViewport.y

          const referencesPosition = new Vector(
            VIEWPORT_PADDING,
            (showAtBottom ? centerOfViewport.y : upperLeftOfViewport.y) -
            VIEWPORT_PADDING,
          )

          const viewportBoundsWithPadding = getViewportDimensionsWithPadding()

          const editor = generateEditor(
            {
              type: CanvasEditorType.REFERENCES_EDITOR,
              uuid: editorId,
              referencesModel,
              codeEditor,
              range,
              xPosition: referencesPosition.x,
              yPosition: referencesPosition.y,
              width: viewportBoundsWithPadding.x - VIEWPORT_PADDING,
              height: viewportBoundsWithPadding.y / 2,
            },
            get().canvasScale,
          )
          if (editor == null) return

          idToEditorMap.set(editorId, editor)
          set({ idToEditorMap })
        },
        createReferencesEditorElement(
          domElement,
          referencesModel,
          codeEditor,
          range,
          editorId,
        ) {
          const haystackService = get().haystackService
          if (haystackService == null) return null

          const referencesWidget = haystackService.createReferenceEditorElement(
            domElement,
            referencesModel,
            codeEditor,
            range,
            editorId,
          )

          const idToEditorMap = new Map(get().idToEditorMap)
          const editor = idToEditorMap.get(editorId)
          if (
            editor != null &&
            editor.type === CanvasEditorType.REFERENCES_EDITOR
          ) {
            idToEditorMap.set(editorId, { ...editor, referencesWidget })
            set({ idToEditorMap })
          }

          return referencesWidget
        },
        async insertFileEditorAtCenterOfViewport(
          filePath,
          uri,
          editorPanePromise,
          args,
          options,
        ) {
          await get().haystackServiceIsInitialized.p
          if (get().haystackService == null) return ""

          const width = args?.existingEditorInput?.input.getWidth() ?? null
          const height = args?.existingEditorInput?.input.getHeight() ?? null

          const size =
            width != null && height != null
              ? new Vector(width, height)
              : await getEditorSizeForFile(uri, get().haystackService!)

          const canvasScale = get().canvasScale

          const selection = new Set<string>()
          const editorId = uuid.generateUuid()
          const upperLeftQuadrant = getUpperLeftQuadrantViewport()

          const existingXPosition = args?.existingEditorInput?.input.getXPosition()
          const existingYPosition = args?.existingEditorInput?.input.getYPosition()

          const centerOfScene = Vector.sub(Vector.new(), get().canvasCamera)

          const xPosition =
            existingXPosition ? (existingXPosition * canvasScale + centerOfScene.x) : null
          const yPosition =
            existingYPosition ? (existingYPosition * canvasScale + centerOfScene.y) : null

          const editorPosition =
            xPosition != null && yPosition != null
              ? new Vector(xPosition, yPosition)
              : get().getPositionForNewEditor(
                upperLeftQuadrant,
                size,
                get().idToEditorMap,
              )
          const editor = generateEditor(
            {
              type: CanvasEditorType.CODE_EDITOR,
              uuid: editorId,
              filePath,
              uri,
              xPosition: editorPosition.x,
              yPosition: editorPosition.y,
              width: size.x,
              height: size.y,
              options,
              editorPanePromise,
              ...args,
            },
            get().canvasScale,
          )
          const idToEditorMap = new Map(get().idToEditorMap)
          if (editor == null) return ""

          idToEditorMap.set(editorId, editor)

          selection.add(editorId)
          set({ idToEditorMap, selection })

          if (args?.doNotPanTo === true) return editorId

          const editorPos = get().getEditorPosition(editor.uuid)
          const transformedPos = transformFromViewportToCanvas(
            editorPos,
            get().canvasScale,
          )

          navigateToPosition(
            transformedPos,
            new Vector(editor.width, editor.height),
            NavigationType.JUST_ENOUGH,
          )

          return editorId
        },
        async insertSymbolEditorAtCenterOfViewport(
          symbolName,
          symbolType,
          range,
          filePath,
          uri,
          editorPanePromise,
          args,
          options,
        ) {
          const idToEditorMap = new Map(get().idToEditorMap)
          const editorId = uuid.generateUuid()
          const upperLeftQuadrant = getUpperLeftQuadrantViewport()
          if (get().haystackService == null) return ""

          const width = args?.existingEditorInput?.input.getWidth() ?? null
          const height = args?.existingEditorInput?.input.getHeight() ?? null

          const size =
            width != null && height != null
              ? new Vector(width, height)
              : await getEditorSizeForSymbol(uri, range, get().haystackService!)

          const xPosition =
            args?.existingEditorInput?.input.getXPosition() ?? null
          const yPosition =
            args?.existingEditorInput?.input.getYPosition() ?? null

          const editorPosition =
            xPosition != null && yPosition != null
              ? new Vector(xPosition, yPosition)
              : get().getPositionForNewEditor(
                upperLeftQuadrant,
                size,
                get().idToEditorMap,
              )
          options = options ?? {}
          options.range = range

          const editor = generateEditor(
            {
              type: CanvasEditorType.CODE_EDITOR,
              uuid: editorId,
              symbolName,
              symbolType,
              range,
              filePath,
              uri,
              xPosition: editorPosition.x,
              yPosition: editorPosition.y,
              width: size.x,
              height: size.y,
              options,
              editorPanePromise,
              ...args,
              ...options,
            },
            get().canvasScale,
          )
          if (editor == null) return ""
          idToEditorMap.set(editorId, editor)
          set({ idToEditorMap })

          if (args?.doNotPanTo === true) return editorId

          const editorPos = get().getEditorPosition(editor.uuid)
          const transformedPos = transformFromViewportToCanvas(
            editorPos,
            get().canvasScale,
          )

          navigateToPosition(
            transformedPos,
            new Vector(editor.width, editor.height),
            NavigationType.JUST_ENOUGH,
          )

          return editorId
        },
        async insertGhostEditorAtCenterOfViewport(
          symbolName,
          symbolType,
          range,
          filePath,
          uri,
          value,
          args,
          options,
        ) {
          const editorId = uuid.generateUuid()
          const upperLeftQuadrant = getUpperLeftQuadrantViewport()
          if (get().haystackService == null) return ""

          const size = await getEditorSizeForFile(uri, get().haystackService!)

          const editorPosition = get().getPositionForNewEditor(
            upperLeftQuadrant,
            size,
            get().idToEditorMap,
          )

          const editor = generateEditor(
            {
              type: CanvasEditorType.GHOST_EDITOR,
              uuid: editorId,
              symbolName,
              symbolType,
              range,
              filePath,
              uri,
              xPosition: editorPosition.x,
              yPosition: editorPosition.y,
              width: size.x,
              height: size.y,
              value,
              isGhost: true,
              options,
              ...args,
              ...options,
            },
            get().canvasScale,
          )
          if (editor == null) {
            return ""
          }
          const idToEditorMap = new Map(get().idToEditorMap)
          idToEditorMap.set(editorId, editor)
          set({ idToEditorMap })
          return editorId
        },
        async insertFileDiffEditorAtCenterOfViewport(
          filePath,
          originalUri,
          modifiedUri,
          editorPanePromise,
          args,
          options,
        ) {
          await get().haystackServiceIsInitialized.p
          if (get().haystackService == null) return ""

          const width = args?.existingEditorInput?.input.getWidth() ?? null
          const height = args?.existingEditorInput?.input.getHeight() ?? null

          const size =
            width != null && height != null
              ? new Vector(width, height)
              : await getEditorSizeForFile(modifiedUri, get().haystackService!)

          const idToEditorMap = new Map(get().idToEditorMap)
          const selection = new Set<string>()
          const editorId = uuid.generateUuid()
          const upperLeftQuadrant = getUpperLeftQuadrantViewport()
          const xPosition =
            args?.existingEditorInput?.input.getXPosition() ?? null
          const yPosition =
            args?.existingEditorInput?.input.getYPosition() ?? null
          const editorPosition =
            xPosition != null && yPosition != null
              ? new Vector(xPosition, yPosition)
              : get().getPositionForNewEditor(
                upperLeftQuadrant,
                size,
                get().idToEditorMap,
              )
          const editor = generateEditor(
            {
              type: CanvasEditorType.DIFF_EDITOR,
              uuid: editorId,
              filePath,
              xPosition: editorPosition.x,
              yPosition: editorPosition.y,
              width: DEFAULT_DIFF_EDITOR_WIDTH,
              height: size.y,
              originalUri,
              modifiedUri,
              editorPanePromise,
              ...args,
              options,
            },
            get().canvasScale,
          )
          if (editor == null) return ""

          idToEditorMap.set(editorId, editor)
          selection.add(editorId)
          set({ idToEditorMap, selection })

          if (args?.doNotPanTo === true) return editorId

          const editorPos = get().getEditorPosition(editor.uuid)
          const transformedPos = transformFromViewportToCanvas(
            editorPos,
            get().canvasScale,
          )

          navigateToPosition(
            transformedPos,
            new Vector(editor.width, editor.height),
            NavigationType.JUST_ENOUGH,
          )

          return editorId
        },
        async insertMergeEditorAtCenterOfViewport(editorInput, args, options, deferredEditorPanePromise) {
          await get().haystackServiceIsInitialized.p
          if (get().haystackService == null) return ""

          const width = args?.existingEditorInput?.input.getWidth() ?? null
          const height = args?.existingEditorInput?.input.getHeight() ?? null

          const initialSize =
            (width != null && height != null
              ? new Vector(width, height)
              : await getEditorSizeForFile(editorInput.input2.resource, get().haystackService!))
          const finalSize = new Vector(initialSize.x, initialSize.y * 2)

          const idToEditorMap = new Map(get().idToEditorMap)
          const selection = new Set<string>()
          const editorId = uuid.generateUuid()
          const upperLeftQuadrant = getUpperLeftQuadrantViewport()
          const xPosition =
            args?.existingEditorInput?.input.getXPosition() ?? null
          const yPosition =
            args?.existingEditorInput?.input.getYPosition() ?? null
          const editorPosition =
            xPosition != null && yPosition != null
              ? new Vector(xPosition, yPosition)
              : get().getPositionForNewEditor(
                upperLeftQuadrant,
                finalSize,
                get().idToEditorMap,
              )
          const editor = generateEditor(
            {
              type: CanvasEditorType.MERGE_EDITOR,
              uuid: editorId,
              editorInput,
              xPosition: editorPosition.x,
              yPosition: editorPosition.y,
              width: DEFAULT_DIFF_EDITOR_WIDTH,
              height: finalSize.y,
              deferredEditorPanePromise,
              ...args,
              options,
            },
            get().canvasScale,
          )

          if (editor == null) return ""

          idToEditorMap.set(editorId, editor)
          selection.add(editorId)
          set({ idToEditorMap, selection })

          if (args?.doNotPanTo === true) return editorId

          const editorPos = get().getEditorPosition(editor.uuid)
          const transformedPos = transformFromViewportToCanvas(
            editorPos,
            get().canvasScale,
          )

          navigateToPosition(
            transformedPos,
            new Vector(editor.width, editor.height),
            NavigationType.JUST_ENOUGH,
          )

          return editorId
        },
        async insertModalEditorAtCenterOfViewport(
          editorInput,
          args,
          options,
          editorPanePromise,
        ) {
          const idToEditorMap = new Map(get().idToEditorMap)
          const selection = new Set<string>()
          const editorId = uuid.generateUuid()
          const upperLeftQuadrant = getUpperLeftQuadrantViewport()

          const width = args?.existingEditorInput?.input.getWidth() ?? null
          const height = args?.existingEditorInput?.input.getHeight() ?? null

          const size =
            width != null && height != null
              ? new Vector(width, height)
              : new Vector(
                DEFAULT_EDITOR_WIDTH,
                Math.min(
                  DEFAULT_EDITOR_HEIGHT,
                  RendererManager.getInstance().getViewportDimensionsWithDoublePadding()
                    .y,
                ),
              )

          const xPosition =
            args?.existingEditorInput?.input.getXPosition() ?? null
          const yPosition =
            args?.existingEditorInput?.input.getYPosition() ?? null
          const editorPosition =
            xPosition != null && yPosition != null
              ? new Vector(xPosition, yPosition)
              : get().getPositionForNewEditor(
                upperLeftQuadrant,
                size,
                get().idToEditorMap,
              )
          const editor = generateEditor(
            {
              type: CanvasEditorType.MODAL_EDITOR,
              uuid: editorId,
              xPosition: editorPosition.x,
              yPosition: editorPosition.y,
              width: size.x,
              height: size.y,
              editorInput,
              editorPanePromise,
              ...args,
              options,
            },
            get().canvasScale,
          )
          if (editor == null) return ""

          idToEditorMap.set(editorId, editor)
          selection.add(editorId)
          set({ idToEditorMap, selection })

          if (args?.doNotPanTo === true) return editorId

          const editorPos = get().getEditorPosition(editor.uuid)
          const transformedPos = transformFromViewportToCanvas(
            editorPos,
            get().canvasScale,
          )
          navigateToPosition(
            transformedPos,
            new Vector(editor.width, editor.height),
            NavigationType.JUST_ENOUGH,
          )

          return editorId
        },
        insertCopilotSettingsEditorAtCenterofViewport() {
          for (const editor of get().idToEditorMap.values()) {
            if (editor.type === CanvasEditorType.COPILOT_SETTINGS_EDITOR) {
              // We already have a settings editor. navigate to it.
              get().navigateToEditor(editor, NavigationType.CENTER)
              return editor.uuid
            }
          }

          const idToEditorMap = new Map(get().idToEditorMap)
          const selection = new Set<string>()
          const editorId = uuid.generateUuid()
          const upperLeftQuadrant = getUpperLeftQuadrantViewport()

          const size = new Vector(
            DEFAULT_EDITOR_WIDTH,
            Math.min(
              DEFAULT_EDITOR_HEIGHT,
              RendererManager.getInstance().getViewportDimensionsWithDoublePadding()
                .y,
            ),
          )

          const editorPosition = get().getPositionForNewEditor(
            upperLeftQuadrant,
            size,
            get().idToEditorMap,
          )

          const editor = generateEditor(
            {
              type: CanvasEditorType.COPILOT_SETTINGS_EDITOR,
              uuid: editorId,
              xPosition: editorPosition.x,
              yPosition: editorPosition.y,
              width: size.x,
              height: size.y,
              zIndex: 3,
            },
            get().canvasScale,
          )
          if (editor == null) return ""

          idToEditorMap.set(editorId, editor)
          selection.add(editorId)
          set({ idToEditorMap, selection })

          const editorPos = get().getEditorPosition(editor.uuid)
          const transformedPos = transformFromViewportToCanvas(
            editorPos,
            get().canvasScale,
          )
          navigateToPosition(
            transformedPos,
            new Vector(editor.width, editor.height),
            NavigationType.JUST_ENOUGH,
          )

          return editorId
        },
        insertHaystackKeybindingsEditorAtCenterOfViewport() {
          for (const editor of get().idToEditorMap.values()) {
            if (editor.type === CanvasEditorType.HAYSTACK_KEYBINDINGS_EDITOR) {
              // We already have a settings editor. navigate to it.
              get().navigateToEditor(editor, NavigationType.CENTER)
              return editor.uuid
            }
          }

          const idToEditorMap = new Map(get().idToEditorMap)
          const selection = new Set<string>()
          const editorId = uuid.generateUuid()
          const upperLeftQuadrant = getUpperLeftQuadrantViewport()

          const size = new Vector(
            DEFAULT_EDITOR_WIDTH,
            RendererManager.getInstance().getViewportDimensionsWithDoublePadding().y,
          )

          const editorPosition = get().getPositionForNewEditor(
            upperLeftQuadrant,
            size,
            get().idToEditorMap,
          )

          const editor = generateEditor(
            {
              type: CanvasEditorType.HAYSTACK_KEYBINDINGS_EDITOR,
              uuid: editorId,
              xPosition: editorPosition.x,
              yPosition: editorPosition.y,
              width: size.x,
              height: size.y,
              zIndex: 3,
            },
            get().canvasScale,
          )
          if (editor == null) return ""

          idToEditorMap.set(editorId, editor)
          selection.add(editorId)
          set({ idToEditorMap, selection })

          const editorPos = get().getEditorPosition(editor.uuid)
          const transformedPos = transformFromViewportToCanvas(
            editorPos,
            get().canvasScale,
          )
          navigateToPosition(
            transformedPos,
            new Vector(editor.width, editor.height),
            NavigationType.JUST_ENOUGH,
          )

          return editorId
        },
        removeEditor: (id: string) => {
          const idToEditorMap = new Map(get().idToEditorMap)
          idToEditorMap.delete(id)
          set({ idToEditorMap })
        },
        insertEditorAtPosition: (
          editorArgs: EditorArgs,
          position: Vector,
          selectAndFocusEditor: boolean,
        ) => {
          const idToEditorMap = new Map(get().idToEditorMap)
          const scale = get().canvasScale

          const finalEditorArgs: FinalEditorArgs = {
            ...editorArgs,
            uuid: uuid.generateUuid(),
            xPosition: position.x,
            yPosition: position.y,
          }

          const insertedEditor = generateEditor(finalEditorArgs, scale)
          if (insertedEditor == null) return ""

          idToEditorMap.set(finalEditorArgs.uuid, insertedEditor)
          if (selectAndFocusEditor) {
            set({
              idToEditorMap,
              selection: new Set([insertedEditor.uuid]),
              editorToFocus: insertedEditor.uuid,
            })
          } else {
            set({
              idToEditorMap,
            })
          }
          return finalEditorArgs.uuid
        },
        updateEditorSize: (id: string, numLines?: number, column?: number) => {
          // Don't update size for non-focused editor.
          if (get().focusedEditorId !== id) return

          const idToEditorMap = new Map(get().idToEditorMap)
          const editor = idToEditorMap.get(id)
          if (editor == null || editor.hasResized || editor.isPinned) {
            return
          }

          const editorPosition = get().getEditorPosition(id)
          const canvasScale = get().canvasScale
          const editorWidthInViewport = editor.width * canvasScale
          const viewportSizeWithoutPadding =
            RendererManager.getInstance().getViewportDimensions()

          // First set the editor's width, if applicable.
          // Note that the column provided is not necessarily the max column.
          if (column != null) {
            const lineNumberDecorationWidth = 73
            const longestLineWidth =
              Math.round((column + 5) * 7.23) + lineNumberDecorationWidth
            editor.width = clamp(
              longestLineWidth,
              editor.width,
              viewportSizeWithoutPadding.x / canvasScale -
              editorPosition.x * canvasScale,
            )
            idToEditorMap.set(id, { ...editor })
            set({ idToEditorMap })
          }

          // We only adjust the height if the viewport currently contains the editor's top length.
          const viewportRect = Rectangle.fromPositionAndSize(
            Vector.new(),
            viewportSizeWithoutPadding,
          )

          if (
            !viewportRect.containsPoint(editorPosition) ||
            !viewportRect.containsPoint(
              Vector.add(editorPosition, new Vector(editorWidthInViewport, 0)),
            )
          ) {
            return
          }

          let projectedHeight: number
          if (numLines == null) {
            projectedHeight = getSizeForEditor(editor).y
          } else {
            projectedHeight = (numLines + 5) * LINE_HEIGHT + HEADER_HEIGHT
          }

          // The max height would be the bottom of the viewport to the top of the editor.
          // We need to convert this into canvas space.
          const maxHeight =
            (RendererManager.getInstance().getViewportDimensionsWithPadding()
              .y -
              editorPosition.y) /
            get().canvasScale

          projectedHeight = Math.min(projectedHeight, maxHeight)

          editor.height = projectedHeight
          idToEditorMap.set(id, { ...editor })
          set({ idToEditorMap })
        },
        updateEditorBounds: (
          id: string,
          posDelta: Vector,
          sizeDelta: Vector,
        ) => {
          const idToEditorMap = get().idToEditorMap.size
            ? new Map(get().idToEditorMap)
            : new Map<string, CanvasCodeEditor>()
          const selection = get().selection
          if (idToEditorMap.size === 0) return

          if (!selection.has(id)) {
            selection.add(id)
          }

          for (const editorId of get().selection) {
            const editor = {
              ...idToEditorMap.get(editorId),
            } as CanvasEditor | null
            if (editor == null) continue

            if (editor.isPinned) {
              editor.vxPosition = editor.vxPosition + posDelta.x
              editor.vyPosition = editor.vyPosition + posDelta.y
              editor.vWidth = Math.max(
                MIN_EDITOR_WIDTH,
                editor.vWidth + sizeDelta.x,
              )
              editor.vHeight = Math.max(
                MIN_EDITOR_HEIGHT,
                editor.vHeight + sizeDelta.y,
              )
            } else {
              editor.xPosition = editor.xPosition + posDelta.x
              editor.yPosition = editor.yPosition + posDelta.y
              editor.width = Math.max(
                MIN_EDITOR_WIDTH,
                editor.width + sizeDelta.x,
              )
              editor.height = Math.max(
                MIN_EDITOR_HEIGHT,
                editor.height + sizeDelta.y,
              )
            }

            editor.hasResized = true
            idToEditorMap.set(editor.uuid, editor)
          }
          set({ idToEditorMap })
        },
        setScale: (newScale: number, mousePosition: Vector) => {
          if (get().canvasScale === newScale) return
          const scaleDelta = newScale / get().canvasScale
          const centerOfScene = Vector.sub(Vector.new(), get().canvasCamera)

          const idToEditorMap = get().idToEditorMap.size
            ? new Map(get().idToEditorMap)
            : new Map<string, CanvasCodeEditor>()

          const adjustedPosition = Vector.add(centerOfScene, mousePosition)

          if (idToEditorMap.size) {
            for (const editor of idToEditorMap.values()) {
              if (editor.type === CanvasEditorType.REFERENCES_EDITOR) continue

              // Find the delta needed to preserve the file editor position's distance from the mouse.
              editor.xPosition =
                (editor.xPosition - adjustedPosition.x) * scaleDelta +
                adjustedPosition.x
              editor.yPosition =
                (editor.yPosition - adjustedPosition.y) * scaleDelta +
                adjustedPosition.y
            }
          }

          set({
            canvasScale: newScale,
            idToEditorMap,
          })
        },
        updateUiPosition: (cameraDelta: Vector) => {
          set({
            canvasCamera: Vector.add(get().canvasCamera, cameraDelta),
          })
        },
        setFocusEditor(editorId: string) {
          set({ editorToFocus: editorId })
        },
        selectEditor: (editorId: string, clearSelection: boolean) => {
          const oldSelection = get().selection
          const selection = clearSelection
            ? new Set<string>()
            : new Set(oldSelection)

          const editor = get().idToEditorMap.get(editorId)
          if (editor == null) return

          if (
            clearSelection
              ? oldSelection.size !== 1 || !oldSelection.has(editorId)
              : !selection.has(editorId)
          ) {
            selection.add(editorId)
            set({ selection })
          }
        },
        deselectEditor: (editorId: string) => {
          const selection = new Set(get().selection)
          selection.delete(editorId)
          set({ selection })
        },
        selectAllEditors: () => {
          const selection = new Set<string>()
          const idToEditorMap = get().idToEditorMap
          for (const id of idToEditorMap.keys()) {
            selection.add(id)
          }
          set({ selection })
        },
        clearSelection: () => {
          if (get().selection.size > 0) {
            set({ selection: new Set() })
          }
        },
        sendTelemetry: async (eventName: string, properties?: any) => {
          await get().haystackTelemetryServiceIsInitialized.p
          const haystackTelemetryService = get().haystackTelemetryService
          if (haystackTelemetryService == null) return
          haystackTelemetryService.sendTelemetry(eventName, properties)
        },
        deleteEditorsInSelection: async () => {
          const selection = get().selection
          const idToEditorMap = new Map(get().idToEditorMap)

          await get().haystackServiceIsInitialized.p
          const haystackService = get().haystackService
          if (haystackService == null) return

          const numSelectedEditors = selection.size
          let numDeletedEditors = 0

          // Iterate through each identifier and close the editor/delete the editor. We do this individually
          // so that no editors are left in an odd state (i.e. an all-or-nothing transition might be stuck on a confirmation modal).
          for (const editorId of selection) {
            const editor = idToEditorMap.get(editorId)
            if (editor == null) continue

            if (
              (editor.type === CanvasEditorType.CODE_EDITOR ||
                editor.type === CanvasEditorType.DIFF_EDITOR ||
                editor.type === CanvasEditorType.MODAL_EDITOR ||
                editor.type === CanvasEditorType.GHOST_EDITOR) &&
              editor.identifier != null
            ) {
              let editor_type
              if (editor.type == CanvasEditorType.CODE_EDITOR) {
                editor_type = "code"
              } else if (editor.type == CanvasEditorType.GHOST_EDITOR) {
                editor_type = "ghost"
              } else if (editor.type == CanvasEditorType.DIFF_EDITOR) {
                editor_type = "diff"
              }
              get().sendTelemetry("editor closed", {
                editorId: editorId,
                editorType: editor_type,
              })
              if (
                await haystackService.closeEditor(editor.identifier, {
                  closeUnconditionally:
                    editor.type === CanvasEditorType.GHOST_EDITOR &&
                    editor.isGhost,
                })
              ) {
                // Grabs a fresh editor ID to editor map.
                const idToEditorMap = new Map(get().idToEditorMap)
                idToEditorMap.delete(editorId)
                // To prevent stale state (because the await above is unbounded due to needing user input),
                // we must set the state per iteration.
                set({ idToEditorMap })
                ++numDeletedEditors
              } else {
              }
            } else {
              const idToEditorMap = new Map(get().idToEditorMap)
              idToEditorMap.delete(editorId)
              // To prevent stale state (because the await above is unbounded due to needing user input),
              // we must set the state per iteration.
              set({ idToEditorMap })
            }
          }

          commitAction()

          if (numDeletedEditors !== numSelectedEditors) return

          set({ selection: new Set() })

          get().goToPreviousEditorInHistoryStack()
        },
        dragSelectEditors(boundingRectangle: Rectangle, onlyAdd: boolean) {
          const idToEditorMap = get().idToEditorMap
          const selection = new Set(get().selection)
          const scale = get().canvasScale
          let modifiedSelection = false
          for (const editor of idToEditorMap.values()) {
            const editorPosition = get().getEditorPosition(editor.uuid)
            const editorSize = getSizeForEditorWithScale(editor, scale)
            const editorBounds = new Rectangle(
              editorPosition.x,
              editorPosition.y,
              editorPosition.x + editorSize.x,
              editorPosition.y + editorSize.y,
            )
            const editorIntersects = boundingRectangle.intersects(editorBounds)
            const isSelected = selection.has(editor.uuid)
            if (!isSelected && editorIntersects) {
              modifiedSelection = true
              selection.add(editor.uuid)
            } else if (!onlyAdd && isSelected && !editorIntersects) {
              modifiedSelection = true
              selection.delete(editor.uuid)
            }
          }
          if (modifiedSelection) {
            set({ selection })
          }
        },
        async closeEditor(editorId, doNotPan) {
          const editor = get().idToEditorMap.get(editorId)

          await get().haystackServiceIsInitialized.p
          const haystackService = get().haystackService
          if (haystackService == null) return

          if (
            editor != null &&
            (editor.type === CanvasEditorType.CODE_EDITOR ||
              editor.type === CanvasEditorType.DIFF_EDITOR ||
              editor.type === CanvasEditorType.MODAL_EDITOR ||
              editor.type === CanvasEditorType.GHOST_EDITOR) &&
            editor.identifier != null
          ) {
            let editor_type
            if (editor.type == CanvasEditorType.CODE_EDITOR) {
              editor_type = "code"
            } else if (editor.type == CanvasEditorType.GHOST_EDITOR) {
              editor_type = "ghost"
            } else if (editor.type == CanvasEditorType.DIFF_EDITOR) {
              editor_type = "diff"
            } else if (editor.type === CanvasEditorType.MODAL_EDITOR) {
              editor_type = "modal"
            }
            get().sendTelemetry("editor closed", {
              editorId: editorId,
              editorType: editor_type,
            })

            const isClosed = await haystackService.closeEditor(
              editor.identifier,
              {
                closeUnconditionally:
                  editor.type === CanvasEditorType.GHOST_EDITOR &&
                  editor.isGhost,
              },
            )

            if (!isClosed) return

            const openEditors = new Set(get().openEditors)
            openEditors.delete(editor.identifier)
            set({ openEditors })
          }

          const idToEditorMap = new Map(get().idToEditorMap)
          const selection = new Set(get().selection)

          selection.delete(editorId)
          idToEditorMap.delete(editorId)

          set({
            idToEditorMap,
            selection,
            editorToFocus: "",
          })

          if (doNotPan || selection.size > 0) return

          get().goToPreviousEditorInHistoryStack()
        },
        async removeEditorForEditor(editorId: string) {
          const haystackService = get().haystackService
          if (haystackService == null) return

          const editor = get().idToEditorMap.get(editorId)

          if (
            editor != null &&
            (editor.type === CanvasEditorType.CODE_EDITOR ||
              editor.type === CanvasEditorType.DIFF_EDITOR ||
              editor.type === CanvasEditorType.MODAL_EDITOR ||
              editor.type === CanvasEditorType.GHOST_EDITOR) &&
            editor.identifier != null
          ) {
            await haystackService.closeEditor(editor.identifier, {
              closeUnconditionally: true,
            })

            const openEditors = new Set(get().openEditors)
            openEditors.delete(editor.identifier)
            set({ openEditors })
          }
        },
        insertAdjacentEditor: async (
          editorId: string,
          editorArgs: EditorArgs,
          selectAndFocusEditor: boolean,
          args?: EditorOpenArgs,
        ) => {
          // Checks if editor already exists. If so, pan to it.
          for (const editor of get().idToEditorMap.values()) {
            if (editor.type !== CanvasEditorType.CODE_EDITOR) {
              continue
            }

            const codeEditorArgs = editorArgs as CodeEditorArgs
            const codeEditor = editor as CanvasCodeEditor
            if (
              codeEditor.uri.toString() === codeEditorArgs.uri.toString() &&
              Range.equalsRange(codeEditor.editRange, codeEditorArgs.range)
            ) {
              // If we're not selecting or focusing the editor, just return in this case.
              if (!selectAndFocusEditor) return editor.uuid

              get().navigateToEditor(editor, NavigationType.CENTER)

              const haystackService = get().haystackService
              if (
                haystackService &&
                args?.selectionRange &&
                codeEditor.identifier != null
              ) {
                haystackService.setEditorSelection(
                  codeEditor.identifier,
                  args.selectionRange,
                )
              }
              return editor.uuid
            }
          }

          let size: Vector
          await get().haystackServiceIsInitialized.p
          const haystackService = get().haystackService
          if (haystackService == null) return ""

          if (isSymbolEditorType(editorArgs)) {
            size = await getEditorSizeForSymbol(
              (editorArgs as CodeEditorArgs).uri,
              (editorArgs as CodeEditorArgs).range!,
              haystackService,
            )
          } else {
            size = await getEditorSizeForFile(
              (editorArgs as CanvasCodeEditor).uri,
              haystackService,
            )
          }

          const idToEditorMap = new Map(get().idToEditorMap)
          const originalEditor = idToEditorMap.get(editorId)
          if (originalEditor == null) return ""

          const scale = get().canvasScale
          const editorSize = new Vector(
            originalEditor.width,
            originalEditor.height,
          )
          const adjacentEditorPosition = get().getEditorPosition(editorId)

          const adjacentPosition = new Vector(
            adjacentEditorPosition.x + (editorSize.x + 20) * scale,
            adjacentEditorPosition.y,
          )

          // Checks if the editor fits in the viewport at the current Y position.
          // If not, we add the editor at the top of the viewport.
          if (
            adjacentPosition.y + size.y * scale >
            RendererManager.getInstance().getViewportDimensionsWithDoublePadding()
              .y
          ) {
            adjacentPosition.y = getUpperLeftQuadrantViewport().y
          }

          const newEditorPosition = get().getPositionForNewEditor(
            adjacentPosition,
            size,
            get().idToEditorMap,
          )

          const finalEditorArgs: FinalEditorArgs = {
            ...editorArgs,
            uuid: uuid.generateUuid(),
            xPosition: newEditorPosition.x,
            yPosition: newEditorPosition.y,
            width: size.x,
            height: size.y,
            ...args,
          }

          const insertedEditor = generateEditor(
            finalEditorArgs,
            get().canvasScale,
          )
          if (insertedEditor == null) return ""

          idToEditorMap.set(finalEditorArgs.uuid, insertedEditor)

          if (selectAndFocusEditor) {
            const selection = new Set<string>()
            selection.add(finalEditorArgs.uuid)
            set({
              idToEditorMap,
              selection,
              editorToFocus: finalEditorArgs.uuid,
            })
          } else {
            set({ idToEditorMap })
            // Don't navigate to the editor.
            return editorId
          }

          const newEditorPositionInViewport = Vector.add(
            newEditorPosition,
            get().canvasCamera,
          )

          const transformedPosition = transformFromViewportToCanvas(
            newEditorPositionInViewport,
            get().canvasScale,
          )

          navigateToPosition(
            transformedPosition,
            new Vector(insertedEditor.width, insertedEditor.height),
            NavigationType.JUST_ENOUGH,
          )

          return finalEditorArgs.uuid
        },
        addDefinitionEditor: async (
          fromEditor: CanvasEditor,
          editorArgs: EditorArgs,
        ) => {
          return await get().insertAdjacentEditor(
            fromEditor.uuid,
            editorArgs,
            /* selectAndFocusEditor */ false,
          )
        },
        // displaySearchEditor: async (
        //   symbolName: string,
        //   symbolType: SymbolKind,
        //   range: IRange,
        //   filePath: string
        // ) => {
        //   const deferredEditorPanePromise = new DeferredPromise<
        //     IEditorPane | undefined
        //   >()
        //   const editorId = await get().insertSymbolEditorAtCenterOfViewport(
        //     symbolName,
        //     symbolType,
        //     range,
        //     filePath,
        //     deferredEditorPanePromise,
        //     undefined,
        //     { preserveFocus: true, transient: true }
        //   )
        //   return editorId
        // },
        hideSearchEditor: (editorId: string) => {
          get().closeEditor(editorId, true)
        },
        async saveEditor(editorIdentifier) {
          const openEditors = get().openEditors
          if (this.haystackService == null) return

          for (const identifier of openEditors) {
            if (
              identifier.editor.editorId === editorIdentifier.editor.editorId &&
              identifier.groupId === editorIdentifier.groupId
            ) {
              get().sendTelemetry("editor saved")
              await this.haystackService.saveEditor(identifier)
              return
            }
          }
        },
        async saveReferenceEditor(uri) {
          const openEditors = get().openEditors
          if (this.haystackService == null) return

          for (const identifier of openEditors) {
            if (identifier.editor.resource?.toString() === uri.toString()) {
              get().sendTelemetry("reference editor saved")
              await this.haystackService.saveEditor(identifier)
              return
            }
          }
        },
        onSaveEditor(uri) {
          const idToEditorMap = new Map(get().idToEditorMap)
          for (const editor of get().idToEditorMap.values()) {
            if (
              editor.type === CanvasEditorType.CODE_EDITOR ||
              editor.type === CanvasEditorType.GHOST_EDITOR
            ) {
              if (editor.uri.toString() === uri.toString()) {
                idToEditorMap.set(editor.uuid, { ...editor, isDirty: false })
              }
            }
            if (editor.type === CanvasEditorType.DIFF_EDITOR) {
              if (editor.modifiedUri.toString() === uri.toString()) {
                idToEditorMap.set(editor.uuid, { ...editor, isDirty: false })
              }
            }
            if (editor.type === CanvasEditorType.REFERENCES_EDITOR) {
              if (editor.currentReferenceUri?.toString() === uri.toString()) {
                idToEditorMap.set(editor.uuid, { ...editor, isDirty: false })
              }
            }
          }

          setTrackChanges(false)
          set({ idToEditorMap })
          setTrackChanges(true)
        },
        setEditorDirty: (editorId: string, isDirty: boolean) => {
          const idToEditorMap = new Map(get().idToEditorMap)
          const canvasEditor = idToEditorMap.get(editorId)
          if (canvasEditor == null) return
          if (isDirty === (canvasEditor as CanvasCodeEditor).isDirty) return
          const dirtyEditor = { ...canvasEditor, isDirty }
          idToEditorMap.set(editorId, dirtyEditor)

          setTrackChanges(false)
          set({ idToEditorMap })
          setTrackChanges(true)
        },
        setEditorShowingCancellationModal: (
          editorId: string,
          showingCancellationModal: boolean,
        ) => {
          const idToEditorMap = new Map(get().idToEditorMap)
          const canvasEditor = idToEditorMap.get(editorId)
          if (canvasEditor == null) return
          const cancelEditor = {
            ...canvasEditor,
            isShowingCancellationModal: showingCancellationModal,
          }
          idToEditorMap.set(editorId, cancelEditor)
          set({ idToEditorMap })
        },
        getPositionForNewEditor: (
          position: Vector,
          size: Vector,
          idToEditorMap: Map<string, CanvasEditor>,
        ) => {
          const canvasScale = get().canvasScale
          const viewportSizeInViewportSpace = getViewportDimensionsWithPadding()
          const newEditorSizeInViewportSpace = Vector.mul(size, canvasScale)

          if (idToEditorMap.size === 0) {
            return Vector.sub(position, get().canvasCamera)
          }

          let topMostPosition: number | null = null

          for (const editor of idToEditorMap.values()) {
            // Skipped pinned editor for positioning.
            if (editor.isPinned) continue

            const editorPositionInViewportSpace = get().getEditorPosition(
              editor.uuid,
              idToEditorMap,
            )
            // There's no way to fit the new editor into the viewport if we take the same
            // Y. Continue instead.
            if (
              editorPositionInViewportSpace.y +
              newEditorSizeInViewportSpace.y >=
              viewportSizeInViewportSpace.y
            ) {
              continue
            }

            const editorSizeInViewportSpace = new Vector(
              editor.width,
              editor.height,
            ).mul(get().canvasScale)

            const editorBounds = Rectangle.fromPositionAndSize(
              editorPositionInViewportSpace,
              editorSizeInViewportSpace,
            )

            // Skip editors whose Y position is offscreen.
            if (
              editorBounds.top < 0 ||
              editorBounds.top > viewportSizeInViewportSpace.y
            ) {
              continue
            }

            if (topMostPosition == null) {
              topMostPosition = editorPositionInViewportSpace.y
            } else {
              topMostPosition = Math.min(
                editorPositionInViewportSpace.y,
                topMostPosition,
              )
            }
          }

          topMostPosition =
            topMostPosition == null ? position.y : topMostPosition

          // We use this as a fallback.
          let positionWithSizeOutOfViewport: Vector | null = null

          // We search in rectangles rightwards.
          for (
            let horizontalStride = 0;
            horizontalStride < 5;
            ++horizontalStride
          ) {
            // Searches from top to bottom, left to right to find a vacant space.
            for (
              let y = topMostPosition;
              y <= viewportSizeInViewportSpace.y;
              y += Math.max(viewportSizeInViewportSpace.y / 100, 1)
            ) {
              for (
                let x = Math.max(
                  position.x,
                  horizontalStride * viewportSizeInViewportSpace.x,
                );
                x <= viewportSizeInViewportSpace.x * (horizontalStride + 1);
                x += Math.max(viewportSizeInViewportSpace.x / 100, 1)
              ) {
                if (
                  horizontalStride > 0 &&
                  positionWithSizeOutOfViewport != null
                ) {
                  return positionWithSizeOutOfViewport
                }
                const coordinate = new Vector(x, y)
                const newEditorBounds = Rectangle.fromPositionAndSize(
                  coordinate,
                  newEditorSizeInViewportSpace,
                )

                const extendsOutsideViewport =
                  horizontalStride === 0 &&
                  (newEditorBounds.right > viewportSizeInViewportSpace.x ||
                    newEditorBounds.bottom > viewportSizeInViewportSpace.y)
                if (
                  extendsOutsideViewport &&
                  positionWithSizeOutOfViewport != null
                ) {
                  continue
                }

                let collision = false
                for (const editor of idToEditorMap.values()) {
                  if (editor.type === CanvasEditorType.REFERENCES_EDITOR)
                    continue

                  const editorPositionInViewportSpace = get().getEditorPosition(
                    editor.uuid,
                    idToEditorMap,
                  )
                  const editorSizeInViewportSpace = editor.isPinned
                    ? new Vector(editor.vWidth, editor.vHeight)
                    : new Vector(editor.width, editor.height).mul(canvasScale)

                  const boundingBox = Rectangle.fromPositionAndSize(
                    editorPositionInViewportSpace,
                    editorSizeInViewportSpace,
                  )
                  if (newEditorBounds.intersects(boundingBox)) {
                    collision = true
                    x = Math.max(x, boundingBox.right)
                    break
                  }
                }
                if (!collision) {
                  if (extendsOutsideViewport) {
                    positionWithSizeOutOfViewport = Vector.sub(
                      coordinate,
                      get().canvasCamera,
                    )
                  } else {
                    // Convert the coordinate back into canvas space.
                    return Vector.sub(coordinate, get().canvasCamera)
                  }
                }
              }
            }
          }

          // Return a position offscreen and then scroll to it.
          return positionWithSizeOutOfViewport ?? viewportSizeInViewportSpace
        },
        getViewportPositionForPinnedEditor: (
          position: Vector,
          size: Vector,
          idToEditorMap: Map<string, CanvasEditor>,
        ) => {
          const viewportSizeInViewportSpace = getViewportDimensionsWithPadding()

          if (idToEditorMap.size === 0) {
            return Vector.sub(position, get().canvasCamera)
          }

          let topMostPosition: number | null = null

          for (const editor of idToEditorMap.values()) {
            if (!editor.isPinned) continue
            const editorPositionInViewportSpace = get().getEditorPosition(
              editor.uuid,
              idToEditorMap,
            )

            // There's no way to fit the new editor into the viewport if we take the same
            // Y. Continue instead.
            if (
              editorPositionInViewportSpace.y + size.y >=
              viewportSizeInViewportSpace.y
            ) {
              continue
            }

            const editorSize = new Vector(editor.vWidth, editor.vHeight)

            const editorBounds = Rectangle.fromPositionAndSize(
              editorPositionInViewportSpace,
              editorSize,
            )

            // Skip editors whose Y position is offscreen.
            if (
              editorBounds.top < 0 ||
              editorBounds.top > viewportSizeInViewportSpace.y
            ) {
              continue
            }

            if (topMostPosition == null) {
              topMostPosition = editorPositionInViewportSpace.y
            } else {
              topMostPosition = Math.min(
                editorPositionInViewportSpace.y,
                topMostPosition,
              )
            }
          }

          topMostPosition =
            topMostPosition == null ? position.y : topMostPosition

          // We use this as a fallback.
          let positionWithSizeOutOfViewport: Vector | null = null

          // We search in rectangles rightwards.
          for (
            let horizontalStride = 0;
            horizontalStride < 5;
            ++horizontalStride
          ) {
            // Searches from top to bottom, left to right to find a vacant space.
            for (
              let y = topMostPosition;
              y <= viewportSizeInViewportSpace.y;
              y += Math.max(viewportSizeInViewportSpace.y / 100, 1)
            ) {
              for (
                let x = Math.max(
                  position.x,
                  horizontalStride * viewportSizeInViewportSpace.x,
                );
                x <= viewportSizeInViewportSpace.x * (horizontalStride + 1);
                x += Math.max(viewportSizeInViewportSpace.x / 100, 1)
              ) {
                if (
                  horizontalStride > 0 &&
                  positionWithSizeOutOfViewport != null
                ) {
                  return positionWithSizeOutOfViewport
                }
                const coordinate = new Vector(x, y)
                const newEditorBounds = Rectangle.fromPositionAndSize(
                  coordinate,
                  size,
                )

                const extendsOutsideViewport =
                  horizontalStride === 0 &&
                  (newEditorBounds.right > viewportSizeInViewportSpace.x ||
                    newEditorBounds.bottom > viewportSizeInViewportSpace.y)
                if (
                  extendsOutsideViewport &&
                  positionWithSizeOutOfViewport != null
                ) {
                  continue
                }

                let collision = false
                for (const editor of idToEditorMap.values()) {
                  if (!editor.isPinned) continue
                  if (editor.type === CanvasEditorType.REFERENCES_EDITOR)
                    continue

                  const editorPositionInViewportSpace = get().getEditorPosition(
                    editor.uuid,
                    idToEditorMap,
                  )
                  const editorSize = new Vector(editor.vWidth, editor.vHeight)

                  const boundingBox = Rectangle.fromPositionAndSize(
                    editorPositionInViewportSpace,
                    editorSize,
                  )

                  if (newEditorBounds.intersects(boundingBox)) {
                    collision = true
                    x = Math.max(x, boundingBox.right)
                    break
                  }
                }
                if (!collision) {
                  if (extendsOutsideViewport) {
                    positionWithSizeOutOfViewport = coordinate.copy()
                  } else {
                    return coordinate
                  }
                }
              }
            }
          }

          // Return a position offscreen and then scroll to it.
          return positionWithSizeOutOfViewport ?? viewportSizeInViewportSpace
        },
        addAdjacentFile: async (
          fromEditor: CanvasEditor,
          filePath: string,
          uri: URI,
          selectAndFocusEditor: boolean,
          args?: EditorOpenArgs,
          options?: IEditorOptions,
        ) => {
          return await get().insertAdjacentEditor(
            fromEditor.uuid,
            {
              type: CanvasEditorType.CODE_EDITOR,
              filePath,
              uri,
              options,
            },
            selectAndFocusEditor,
            args,
          )
        },
        addAdjacentSymbol: async (
          fromEditor: CanvasEditor,
          symbolName: string,
          symbolType: SymbolKind,
          range: IRange,
          filePath: string,
          uri: URI,
          selectAndFocusEditor: boolean,
          args?: EditorOpenArgs,
          options?: IEditorOptions,
        ) => {
          return await get().insertAdjacentEditor(
            fromEditor.uuid,
            {
              type: CanvasEditorType.CODE_EDITOR,
              symbolType: symbolType,
              symbolName: symbolName,
              filePath,
              uri,
              range,
              options: { ...options, range },
            },
            selectAndFocusEditor,
            args,
          )
        },
        getViewportDimensionsWithPadding: () => {
          return getViewportDimensionsWithPadding()
        },
        getEditorSelection: () => {
          const editorSelection: CanvasEditor[] = []
          for (const editorId of get().selection) {
            const editor = get().idToEditorMap.get(editorId)
            if (editor == null) continue
            editorSelection.push(editor)
          }
          return editorSelection
        },
        editorGoUpOneLevel: async (
          canvasEditor: CanvasCodeEditor | CanvasDiffEditor | CanvasGhostEditor,
        ) => {
          await get().haystackServiceIsInitialized.p
          const haystackService = get().haystackService
          if (haystackService == null || canvasEditor.identifier == null) {
            return
          }
          const result = await haystackService.getSymbolUpOneLevel(
            canvasEditor.identifier,
            canvasEditor.editRange!,
          )
          if (result == null) return

          const { symbol, codeEditor } = result

          const idToEditorMap = new Map(get().idToEditorMap)
          if (!idToEditorMap.has(canvasEditor.uuid)) return

          get().sendTelemetry("traversed up one level", {
            editorId: canvasEditor.uuid,
          })

          idToEditorMap.set(canvasEditor.uuid, {
            ...canvasEditor,
            symbolName: symbol?.name ?? null,
            symbolType: symbol?.kind ?? null,
            editRange: symbol?.range ?? null,
            scrollPosition: codeEditor.getVisibleRanges()[0].startLineNumber,
            selectionRange: codeEditor.getSelection()
              ? {
                startLineNumber: codeEditor.getSelection()!.startLineNumber,
                startColumn: codeEditor.getSelection()!.startColumn,
                endLineNumber: codeEditor.getSelection()!.endLineNumber,
                endColumn: codeEditor.getSelection()!.endColumn,
              }
              : null,
            options: { ...canvasEditor.options, range: result?.symbol?.range },
            deferredPanePromise: new DeferredPromise<IEditorPane | undefined>(),
          })

          set({ idToEditorMap })

          const numLines = symbol
            ? symbol.range.endLineNumber - symbol.range.startLineNumber + 1
            : (codeEditor.getModel()?.getLineCount() ?? 50)
          get().updateEditorSize(canvasEditor.uuid, numLines)

          result.codeEditor.focus()
        },
        editorGoDownOneLevel: async (
          canvasEditor: CanvasCodeEditor | CanvasDiffEditor | CanvasGhostEditor,
        ) => {
          await get().haystackServiceIsInitialized.p
          const haystackService = get().haystackService
          if (haystackService == null || canvasEditor.identifier == null) {
            return
          }
          const result = await haystackService.getSymbolDownOneLevel(
            canvasEditor.identifier,
            canvasEditor.editRange!,
          )

          if (result == null) return

          const { symbol, codeEditor } = result

          const idToEditorMap = new Map(get().idToEditorMap)
          if (!idToEditorMap.has(canvasEditor.uuid)) return

          get().sendTelemetry("traversed down one level", {
            editorId: canvasEditor.uuid,
          })

          idToEditorMap.set(canvasEditor.uuid, {
            ...canvasEditor,
            symbolName: symbol?.name ?? null,
            symbolType: symbol?.kind ?? null,
            editRange: symbol?.range ?? null,
            scrollPosition: codeEditor.getVisibleRanges()[0].startLineNumber,
            selectionRange: codeEditor.getSelection()
              ? {
                startLineNumber: codeEditor.getSelection()!.startLineNumber,
                startColumn: codeEditor.getSelection()!.startColumn,
                endLineNumber: codeEditor.getSelection()!.endLineNumber,
                endColumn: codeEditor.getSelection()!.endColumn,
              }
              : null,
            options: { ...canvasEditor.options, range: result?.symbol?.range },
            deferredPanePromise: new DeferredPromise<IEditorPane | undefined>(),
          })
          set({ idToEditorMap })

          const numLines = symbol
            ? symbol.range.endLineNumber - symbol.range.startLineNumber + 1
            : (codeEditor.getModel()?.getLineCount() ?? 50)
          get().updateEditorSize(canvasEditor.uuid, numLines)

          result.codeEditor.focus()
        },
        editorGoToFile: async (
          canvasEditor: CanvasCodeEditor | CanvasDiffEditor | CanvasGhostEditor,
        ) => {
          if (!get().idToEditorMap.has(canvasEditor.uuid)) return

          await get().haystackServiceIsInitialized.p
          const haystackService = get().haystackService
          if (haystackService == null || canvasEditor.identifier == null) {
            return
          }

          const codeEditor = haystackService.getCodeEditor(
            canvasEditor.identifier.editor,
            canvasEditor.identifier.groupId,
          )
          if (codeEditor == null) return

          const idToEditorMap = new Map(get().idToEditorMap)
          if (!idToEditorMap.has(canvasEditor.uuid)) return

          get().sendTelemetry("traversed to file", {
            editorId: canvasEditor.uuid,
          })

          idToEditorMap.set(canvasEditor.uuid, {
            ...canvasEditor,
            symbolName: null,
            symbolType: null,
            editRange: null,
            scrollPosition: codeEditor.getVisibleRanges()[0].startLineNumber,
            selectionRange: codeEditor.getSelection()
              ? {
                startLineNumber: codeEditor.getSelection()!.startLineNumber,
                startColumn: codeEditor.getSelection()!.startColumn,
                endLineNumber: codeEditor.getSelection()!.endLineNumber,
                endColumn: codeEditor.getSelection()!.endColumn,
              }
              : null,
            options: { ...canvasEditor.options, range: undefined },
            deferredPanePromise: new DeferredPromise<IEditorPane | undefined>(),
          })

          set({ idToEditorMap })

          get().updateEditorSize(
            canvasEditor.uuid,
            codeEditor.getModel()?.getLineCount() ?? 50,
          )

          codeEditor.focus()
        },
        editorGoToDeepestSymbol: async (
          canvasEditor: CanvasCodeEditor | CanvasDiffEditor | CanvasGhostEditor,
        ) => {
          const haystackService = get().haystackService
          await get().haystackServiceIsInitialized.p

          if (haystackService == null || canvasEditor.identifier == null) {
            return
          }
          const result = await haystackService.getDeepestSymbol(
            canvasEditor.identifier,
          )
          if (result === undefined) return

          const { symbol, codeEditor } = result

          const idToEditorMap = new Map(get().idToEditorMap)
          if (!idToEditorMap.has(canvasEditor.uuid)) return

          get().sendTelemetry("traversed to deepest symbol", {
            editorId: canvasEditor.uuid,
          })

          idToEditorMap.set(canvasEditor.uuid, {
            ...canvasEditor,
            symbolName: symbol?.name ?? null,
            symbolType: symbol?.kind ?? null,
            editRange: symbol?.range ?? null,
            scrollPosition: codeEditor.getVisibleRanges()[0].startLineNumber,
            selectionRange: codeEditor.getSelection()
              ? {
                startLineNumber: codeEditor.getSelection()!.startLineNumber,
                startColumn: codeEditor.getSelection()!.startColumn,
                endLineNumber: codeEditor.getSelection()!.endLineNumber,
                endColumn: codeEditor.getSelection()!.endColumn,
              }
              : null,
            options: { ...canvasEditor.options, range: result?.symbol?.range },
            deferredPanePromise: new DeferredPromise<IEditorPane | undefined>(),
          })

          set({ idToEditorMap })

          const numLines = symbol
            ? symbol.range.endLineNumber - symbol.range.startLineNumber + 1
            : (codeEditor.getModel()?.getLineCount() ?? 50)
          get().updateEditorSize(canvasEditor.uuid, numLines)

          codeEditor.focus()
        },
        setHaystackService(haystackService: HaystackService) {
          this.haystackServiceIsInitialized.complete()
          set({ haystackService })
        },
        setHaystackTelemetryService(
          haystackTelemetryService: HaystackTelemetryService,
        ) {
          this.haystackTelemetryServiceIsInitialized.complete()
          set({ haystackTelemetryService })
        },
        async openCodeEditorForCanvasEditor(editorId, domElement, options) {
          const editor = get().idToEditorMap.get(editorId) as
            | CanvasCodeEditor
            | CanvasGhostEditor
          if (editor == null) return

          const identifier = await this.haystackService?.createEditorElement(
            editor.uri,
            domElement,
            editor.deferredPanePromise,
            editor.type === CanvasEditorType.CODE_EDITOR ? editor : undefined,
            options,
            {
              highlightRange: editor.highlightRange ?? undefined,
              selectionRange: editor.selectionRange ?? undefined,
              existingEditorInput: editor.existingEditorInput ?? undefined,
              scrollPosition: editor.scrollPosition ?? undefined,
            },
          )
          if (identifier == null) return

          const openEditors = new Set(get().openEditors)
          openEditors.add(identifier)

          const idToEditorMap = new Map(get().idToEditorMap)
          // Grabs a new editor due to async call above.
          const refreshedEditor = idToEditorMap.get(editorId) as
            | CanvasCodeEditor
            | CanvasGhostEditor
          if (refreshedEditor == null) return

          const oldIdentifier = refreshedEditor.identifier

          if (oldIdentifier != null) {
            // We don't await here on purpose.
            this.closeFileEditor(oldIdentifier)
          }

          idToEditorMap.set(editorId, {
            ...refreshedEditor,
            identifier,
            existingEditorInput: null,
          })
          set({ openEditors, idToEditorMap })
        },
        async openFileDiffEditorForCanvasEditor(editorId, domElement, options) {
          const idToEditorMap = new Map(get().idToEditorMap)
          const canvasEditor = idToEditorMap.get(editorId) as
            | CanvasDiffEditor
            | undefined
          if (canvasEditor == null) return null

          const editor = await this.haystackService?.createDiffEditorElement(
            canvasEditor.modifiedUri,
            canvasEditor.originalUri,
            domElement,
            canvasEditor.deferredPanePromise,
            options,
            {
              highlightRange: canvasEditor.highlightRange ?? undefined,
              selectionRange: canvasEditor.selectionRange ?? undefined,
              existingEditorInput:
                canvasEditor.existingEditorInput ?? undefined,
            },
          )
          if (editor == null) return null
          const identifier: IEditorIdentifier = {
            groupId: editor.group.id,
            editor: editor.input!,
          }

          const openEditors = new Set(get().openEditors)
          openEditors.add(identifier)

          idToEditorMap.set(editorId, { ...canvasEditor, identifier })
          set({ openEditors, idToEditorMap })

          return editor
        },
        async openModalEditorForCanvasEditor(
          editorId,
          editorInput,
          domElement,
          options,
        ) {
          const editor = get().idToEditorMap.get(editorId) as CanvasModalEditor
          const identifier =
            await this.haystackService?.createModalEditorElement(
              editorInput,
              domElement,
              editor,
              options,
              {
                highlightRange: editor.highlightRange ?? undefined,
                selectionRange: editor.selectionRange ?? undefined,
                existingEditorInput: editor.existingEditorInput ?? undefined,
                scrollPosition: editor.scrollPosition ?? undefined,
              },
            )
          if (identifier == null) return

          const openEditors = new Set(get().openEditors)
          openEditors.add(identifier)

          const idToEditorMap = new Map(get().idToEditorMap)
          // Grabs a new editor due to async call above.
          const refreshedEditor = idToEditorMap.get(
            editorId,
          ) as CanvasModalEditor
          if (refreshedEditor == null) return

          const oldIdentifier = refreshedEditor.identifier

          if (oldIdentifier != null) {
            // We don't await here on purpose.
            this.closeFileEditor(oldIdentifier)
          }

          idToEditorMap.set(editorId, {
            ...refreshedEditor,
            identifier,
            existingEditorInput: null,
          })
          set({ openEditors, idToEditorMap })
        },
        async openMergeEditorForCanvasEditor(editorId, editorInput, domElement, options) {
          const editor = get().idToEditorMap.get(editorId) as CanvasMergeEditor
          const identifier =
            await this.haystackService?.createMergeEditorElement(
              editorInput,
              domElement,
              editor,
              options,
              {
                highlightRange: editor.highlightRange ?? undefined,
                selectionRange: editor.selectionRange ?? undefined,
                existingEditorInput: editor.existingEditorInput ?? undefined,
                scrollPosition: editor.scrollPosition ?? undefined,
              },
            )
          if (identifier == null) return

          const openEditors = new Set(get().openEditors)
          openEditors.add(identifier)

          const idToEditorMap = new Map(get().idToEditorMap)
          // Grabs a new editor due to async call above.
          const refreshedEditor = idToEditorMap.get(
            editorId,
          ) as CanvasModalEditor
          if (refreshedEditor == null) return

          const oldIdentifier = refreshedEditor.identifier

          if (oldIdentifier != null) {
            // We don't await here on purpose.
            this.closeFileEditor(oldIdentifier)
          }

          idToEditorMap.set(editorId, {
            ...refreshedEditor,
            identifier,
            existingEditorInput: null,
          })
          set({ openEditors, idToEditorMap })
        },
        async closeFileEditor(identifier: IEditorIdentifier) {
          if (this.haystackService == null) return false
          const result = await this.haystackService.closeEditor(identifier)

          const openEditors = new Set(get().openEditors)
          if (result) {
            openEditors.delete(identifier)
            set({ openEditors })
          }
          return result
        },
        getTextModel(uri) {
          return this.haystackService?.getModel(uri) ?? null
        },
        async getOrCreateModel(uri) {
          if (this.haystackService == null) return null
          return this.haystackService.getOrCreateModel(uri)
        },
        getWorkspacePath() {
          return this.haystackService?.getWorkspacePath()
        },
        addOnDidSaveListener(listener) {
          return this.haystackService?.addOnDidSaveListener(listener) ?? null
        },
        getNextZIndex() {
          return 3
        },
        manifestGhostEditor(editorId) {
          const idToEditorMap = new Map(get().idToEditorMap)
          const editor = idToEditorMap.get(editorId) as
            | CanvasCodeEditor
            | undefined
          if (editor == null) return

          // Checks if related ghost editors need to be manifested.
          const newGhostEditorSets = []
          for (const ghostEditorSet of get().ghostEditorSets) {
            if (ghostEditorSet.has(editorId)) {
              for (const ghosteditorId of ghostEditorSet) {
                if (ghosteditorId === editorId) continue
                const ghostEditor = idToEditorMap.get(ghosteditorId)
                if (ghostEditor == null) continue

                idToEditorMap.set(ghosteditorId, {
                  ...ghostEditor,
                  isGhost: false,
                  shouldRespondToCloseEvents: false,
                })
              }
            } else {
              newGhostEditorSets.push(ghostEditorSet)
            }
          }

          idToEditorMap.set(editorId, {
            ...editor,
            isGhost: false,
            shouldRespondToCloseEvents: false,
            symbolName: null,
            symbolType: null,
          })
          set({ idToEditorMap, ghostEditorSets: newGhostEditorSets })
        },
        async openGhostEditorForCanvasEditor(
          editorId,
          originalUri,
          scratchFilePath,
          domElement,
          value,
          editRange,
        ) {
          const identifier =
            await this.haystackService?.createGhostEditorElement(
              originalUri,
              URI.file(scratchFilePath),
              domElement,
              value,
              editRange,
            )
          if (identifier == null) return

          const openEditors = new Set(get().openEditors)
          openEditors.add(identifier)

          const idToEditorMap = new Map(get().idToEditorMap)
          // Grabs a new editor due to async call above.
          const refreshedEditor = idToEditorMap.get(
            editorId,
          ) as CanvasGhostEditor
          if (refreshedEditor == null) return
          idToEditorMap.set(editorId, { ...refreshedEditor, identifier })
          set({ openEditors, idToEditorMap })
        },
        dirtyModel(editorId) {
          this.setEditorDirty(editorId, true)
          if (this.haystackService == null) return
          const editor = get().idToEditorMap.get(editorId) as
            | CanvasCodeEditor
            | CanvasGhostEditor
          if (editor == null) return

          this.haystackService.dirtyModel(URI.file(editor.filePath))
        },
        getInitialEditorWidth() {
          const haystackService = get().haystackService
          if (haystackService == null) return DEFAULT_EDITOR_WIDTH
          return haystackService.getInitialEditorWidth()
        },
        panToEditorWithIdentifier(editorIdentifier) {
          for (const editor of get().idToEditorMap.values()) {
            if (
              editor.type === CanvasEditorType.CODE_EDITOR ||
              editor.type === CanvasEditorType.DIFF_EDITOR ||
              editor.type === CanvasEditorType.MODAL_EDITOR ||
              editor.type === CanvasEditorType.GHOST_EDITOR
            ) {
              if (editor.identifier == null) continue
              if (
                editor.identifier.editor.editorId ===
                editorIdentifier.editor.editorId &&
                editor.identifier.groupId === editorIdentifier.groupId
              ) {
                get().navigateToEditor(editor, NavigationType.CENTER)
                return true
              }
            }
          }

          return false
        },
        setSelectionRange(editorId: string, range: IRange | null) {
          const editor = get().idToEditorMap.get(
            editorId,
          ) as CanvasCodeEditor | null
          if (
            editor == null ||
            Range.equalsRange(editor.selectionRange, range)
          ) {
            return
          }

          // If the new range is sufficiently far from the current one, push the current range
          // into the stack.
          if (
            range != null &&
            editor.selectionRange != null &&
            (Math.abs(
              editor.selectionRange.startLineNumber - range.startLineNumber,
            ) > 5 ||
              Math.abs(
                editor.selectionRange?.endLineNumber - range?.endLineNumber,
              ) > 5)
          ) {
            get().pushToEditorSelectionHistory(editorId, editor.selectionRange)
          }

          const idToEditorMap = new Map(get().idToEditorMap)
          idToEditorMap.set(editorId, { ...editor, selectionRange: range })
          set({ idToEditorMap })
        },
        addGhostEditorSet(ghosteditorIds) {
          const ghostEditorSets = [...get().ghostEditorSets]
          const newGhostEditorSet = new Set<string>()
          for (const ghosteditorId of ghosteditorIds) {
            newGhostEditorSet.add(ghosteditorId)
          }
          ghostEditorSets.push(newGhostEditorSet)
          set({ ghostEditorSets })
        },
        removeGhostEditorSet(ghosteditorIds) {
          const newGhostEditorSets = []

          for (const ghostEditorSet of get().ghostEditorSets) {
            for (const ghosteditorId of ghosteditorIds) {
              ghostEditorSet.delete(ghosteditorId)
            }
            if (ghostEditorSet.size === 0) continue

            newGhostEditorSets.push(ghostEditorSet)
          }

          set({ ghostEditorSets: newGhostEditorSets })
        },
        addSelectionListener(editorId, setSelectionRange) {
          const haystackService = get().haystackService
          if (haystackService == null) return null
          const editor = get().idToEditorMap.get(editorId) as CanvasCodeEditor
          if (editor == null || editor.identifier == null) return null
          const codeEditor = haystackService.getCodeEditor(
            editor.identifier.editor,
            editor.identifier.groupId,
          )
          return (
            codeEditor?.onDidChangeCursorSelection((e) => {
              setSelectionRange(e.selection)
            }) ?? null
          )
        },
        async getSymbolStack(canvasEditor) {
          const haystackService = get().haystackService
          if (
            haystackService == null ||
            canvasEditor.type !== CanvasEditorType.CODE_EDITOR
          ) {
            return []
          }

          return await haystackService.getSymbolStackForEditor(
            canvasEditor.identifier,
          )
        },
        clearEditorRelationshipHighlights(identifier, decorationId) {
          const haystackService = get().haystackService
          if (haystackService == null || identifier == null) return

          haystackService.clearRelationshipHighlights(identifier, decorationId)
        },
        setEditorRelationshipHighlights(editorId, ranges, color) {
          const haystackService = get().haystackService
          if (haystackService == null) return []

          const idToEditorMap = new Map(get().idToEditorMap)
          const editor = idToEditorMap.get(editorId)

          if (
            editor == null ||
            editor.type !== CanvasEditorType.CODE_EDITOR ||
            editor.identifier == null
          ) {
            return []
          }

          return haystackService.setRelationshipHighlights(
            editor.identifier,
            ranges,
            color,
          )
        },
        setZoomLevel(zoomLevel, lastMousePosition) {
          if (zoomLevel === get().canvasScale) return

          RendererManager.getInstance().setCanvasScale(
            zoomLevel,
            lastMousePosition,
          )

          const scaleDelta = zoomLevel / get().canvasScale
          const centerOfScene = Vector.sub(Vector.new(), get().canvasCamera)

          const idToEditorMap = get().idToEditorMap.size
            ? new Map(get().idToEditorMap)
            : new Map<string, CanvasCodeEditor>()

          const adjustedPosition = lastMousePosition
            ? Vector.add(centerOfScene, lastMousePosition)
            : centerOfScene

          if (idToEditorMap.size) {
            for (const editor of idToEditorMap.values()) {
              // Find the delta needed to preserve the file editor position's distance from the mouse.
              editor.xPosition =
                (editor.xPosition - adjustedPosition.x) * scaleDelta +
                centerOfScene.x
              editor.yPosition =
                (editor.yPosition - adjustedPosition.y) * scaleDelta +
                centerOfScene.y
            }
          }

          set({
            canvasScale: zoomLevel,
            idToEditorMap,
          })
        },
        setCurrentReference(editorId, referenceUri, numberOfReferences) {
          const idToEditorMap = new Map(get().idToEditorMap)
          const editor = idToEditorMap.get(editorId) as
            | CanvasReferencesEditor
            | undefined
          if (editor == null) return

          // For updates, the number of references will be null, but we don't
          // wish to reset it.
          const numberOfReferencesNonNull =
            numberOfReferences ?? editor.numberOfReferences
          idToEditorMap.set(editorId, {
            ...editor,
            currentReferenceUri: referenceUri,
            numberOfReferences: numberOfReferencesNonNull,
          })
          set({ idToEditorMap })
        },
        setSortedEditors(sortedEditors) {
          set({ sortedEditors })
        },
        isDarkMode() {
          const haystackService = get().haystackService
          if (haystackService == null) return false
          return haystackService.isDarkMode()
        },
        navigateToEditor(editor, navigationType) {
          // Only focuses if the active focus is in the React application.
          // If the element is in an iframe, this counts as well.
          if (
            appContainerRef.current?.contains(document.activeElement) ||
            document.activeElement?.tagName === "IFRAME"
          ) {
            get().focusOnEditor(editor.uuid)
          }

          get().selectEditor(editor.uuid, true)

          if (
            editor.isPinned ||
            editor.type === CanvasEditorType.REFERENCES_EDITOR
          ) {
            // Do not try to navigate to a pinned editor.
            return
          }

          const editorPos = get().getEditorPosition(editor.uuid)
          const transformedPos = transformFromViewportToCanvas(
            editorPos,
            get().canvasScale,
          )

          navigateToPosition(
            transformedPos,
            new Vector(editor.width, editor.height),
            navigationType,
            /* unconditionally */ true,
          )
        },
        focusOnEditor(editorId) {
          const haystackService = get().haystackService
          const editor = get().idToEditorMap.get(editorId)

          if (editor == null || haystackService == null) return

          if (
            editor.type === CanvasEditorType.CODE_EDITOR ||
            editor.type === CanvasEditorType.GHOST_EDITOR ||
            editor.type === CanvasEditorType.MODAL_EDITOR ||
            editor.type === CanvasEditorType.DIFF_EDITOR
          ) {
            if (editor.identifier == null) return

            if (
              editor.type === CanvasEditorType.MODAL_EDITOR &&
              editor.input instanceof WebviewInput
            ) {
              if (editor.input.webview.isFocused) return
              editor.input.webview.focus()
              return
            }

            haystackService.focusOnEditor(editor.identifier)
          }
        },
        focusOnCanvas() {
          canvasRef.current?.focus()
          get().clearSelection()
        },
        setIsHoldingModifier(isHoldingModifier) {
          set({ isHoldingModifier })
        },
        setIsHoldingOptAlt(isHoldingOptAlt) {
          set({ isHoldingOptAlt })
        },
        setFocusedEditor(editorId: string | null) {
          if (get().focusedEditorId === editorId) return

          if (
            get().focusedEditorId == null ||
            get().idToEditorMap.has(get().focusedEditorId!)
          ) {
            // Pushes the PREVIOUS focused editor onto the history stack.
            get().pushToEditorHistoryStack(get().focusedEditorId)
          }

          // A little bit hacky, but if the newly focused editor is on
          // top of the history stack, that means we likely are here
          // due to deleting a editor. In that case, we should pop the
          // newly focused editor off the stack.
          const previousEditorHistoryStack = get().previousEditorHistoryStack
          if (
            previousEditorHistoryStack.length > 0 &&
            previousEditorHistoryStack[
            previousEditorHistoryStack.length - 1
            ] === editorId
          ) {
            set({
              previousEditorHistoryStack: previousEditorHistoryStack.slice(
                0,
                -1,
              ),
            })
          }

          set({ focusedEditorId: editorId })

          const haystackService = get().haystackService
          haystackService?.setNavigationButtonState(
            get().previousEditorHistoryStack.length,
            get().nextEditorHistoryStack.length,
          )
        },
        panToFocusedEditor(editorId: string) {
          const editor = get().idToEditorMap.get(editorId)
          if (editor == null) return

          if (editor.isPinned) {
            // Do not try to navigate to a pinned editor.
            return
          }

          // Checks if the editor should be panned to.
          // This ensures the entire editor is visible.
          // We don't do this if the user is using the modifier
          // key to move the editor.
          if (!get().isHoldingOptAlt && !get().isHoldingModifier) {
            // If the viewport bounds are too small, do not pan to the editor.
            // This is because otherwise the user will experience bad behavior where
            // Haystack will zoom in/out.
            const viewportDimensions =
              RendererManager.getInstance().getViewportDimensions()
            const editorDimensions = Vector.mul(
              new Vector(editor.width, editor.height),
              get().canvasScale,
            )

            if (
              editorDimensions.x > viewportDimensions.x ||
              editorDimensions.y > viewportDimensions.y
            ) {
              return
            }

            const editorPos = get().getEditorPosition(editorId)
            const transformedPos = transformFromViewportToCanvas(
              editorPos,
              get().canvasScale,
            )

            navigateToPosition(
              transformedPos,
              new Vector(editor.width, editor.height),
              NavigationType.JUST_ENOUGH,
              /* unconditionally */ false,
            )
          }
        },
        getFocusedEditor() {
          const focusededitorId = get().focusedEditorId
          if (focusededitorId == null) return null
          return get().idToEditorMap.get(focusededitorId) ?? null
        },

        getTransformInfoForEditor(editorInput) {
          const idToEditorMap = get().idToEditorMap
          for (const editor of idToEditorMap.values()) {
            if (
              editor.type === CanvasEditorType.CODE_EDITOR ||
              editor.type === CanvasEditorType.DIFF_EDITOR ||
              editor.type === CanvasEditorType.GHOST_EDITOR ||
              editor.type === CanvasEditorType.MODAL_EDITOR
            ) {
              if (editor.identifier?.editor === editorInput) {
                const canvasScale = get().canvasScale
                const centerOfScene = Vector.sub(Vector.new(), get().canvasCamera)

                return {
                  xPosition: (editor.xPosition - centerOfScene.x) / canvasScale,
                  yPosition: (editor.yPosition - centerOfScene.y) / canvasScale,
                  width: editor.width,
                  height: editor.height,
                }
              }
            }
          }
          return null
        },
        isGhostEditor(editorInput) {
          const idToEditorMap = get().idToEditorMap
          for (const editor of idToEditorMap.values()) {
            if (
              editor.type === CanvasEditorType.CODE_EDITOR ||
              editor.type === CanvasEditorType.DIFF_EDITOR ||
              editor.type === CanvasEditorType.GHOST_EDITOR ||
              editor.type === CanvasEditorType.MODAL_EDITOR
            ) {
              if (editor.identifier?.editor === editorInput) {
                return editor.isGhost
              }
            }
          }
          return false
        },
        isModelIndexed(model) {
          const haystackService = get().haystackService
          if (haystackService == null) return Promise.resolve(false)
          return haystackService.isModelIndexed(model)
        },
        isShowingContextMenu() {
          const haystackService = get().haystackService
          if (haystackService == null) return false
          return haystackService.isShowingContextMenu()
        },
        openUrl(url) {
          const haystackService = get().haystackService
          if (haystackService == null) return
          haystackService.openUrl(url, /* trusted */ true)
        },
        async openCanvasWorkspace(filePath) {
          const haystackService = get().haystackService
          if (haystackService == null) return

          for (const editor of get().idToEditorMap.values()) {
            if (
              (editor.type === CanvasEditorType.CODE_EDITOR ||
                editor.type === CanvasEditorType.DIFF_EDITOR ||
                editor.type === CanvasEditorType.MODAL_EDITOR ||
                editor.type === CanvasEditorType.GHOST_EDITOR) &&
              editor.identifier != null
            ) {
              let editor_type
              if (editor.type == CanvasEditorType.CODE_EDITOR) {
                editor_type = "code"
              } else if (editor.type == CanvasEditorType.GHOST_EDITOR) {
                editor_type = "ghost"
              } else if (editor.type == CanvasEditorType.DIFF_EDITOR) {
                editor_type = "diff"
              }
              get().sendTelemetry("editor closed", {
                editorId: editor.uuid,
                editorType: editor_type,
              })
              if (
                await haystackService.closeEditor(editor.identifier, {
                  closeUnconditionally:
                    editor.type === CanvasEditorType.GHOST_EDITOR &&
                    editor.isGhost,
                })
              ) {
                // Grabs a fresh editor ID to editor map.
                const idToEditorMap = new Map(get().idToEditorMap)
                idToEditorMap.delete(editor.uuid)
                // To prevent stale state (because the await above is unbounded due to needing user input),
                // we must set the state per iteration.
                set({ idToEditorMap })
              } else {
                // User has aborted the closure of a editor; abort the entire
                // transaction.
                return
              }
            } else {
              const idToEditorMap = new Map(get().idToEditorMap)
              idToEditorMap.delete(editor.uuid)
              // To prevent stale state (because the await above is unbounded due to needing user input),
              // we must set the state per iteration.
              set({ idToEditorMap })
            }
          }

          // Also clear selection.
          set({ selection: new Set() })

          const canvasWorkspace = haystackService.openCanvasWorkspace(filePath)
          set({ currentCanvasWorkspace: canvasWorkspace })
        },
        setCurrentCanvasWorkspace(canvasWorkspace) {
          set({
            currentCanvasWorkspace: canvasWorkspace,
            canvasWorkspaceIsDirty: false,
          })
        },
        saveCurrentCanvasWorkspace(workspaceName, canvasCamera, canvasScale) {
          const haystackService = get().haystackService
          if (haystackService == null) return
          const canvasWorkspace = haystackService.saveCurrentCanvasWorkspace(
            workspaceName,
            canvasCamera,
            canvasScale,
          )
          set({
            currentCanvasWorkspace: canvasWorkspace,
            canvasWorkspaceIsDirty: false,
          })
        },
        overwriteCurrentCanvasWorkspace() {
          const haystackService = get().haystackService
          if (haystackService == null) return
          const currentCanvasWorkspace = get().currentCanvasWorkspace
          if (currentCanvasWorkspace == null) return

          const canvasWorkspace = haystackService.overwriteCanvasWorkspace(
            currentCanvasWorkspace,
            get().canvasCamera,
            get().canvasScale,
          )
          set({
            canvasWorkspaceIsDirty: false,
            currentCanvasWorkspace: canvasWorkspace,
          })
        },
        async deleteCanvasWorkspace(uniqueId) {
          const haystackService = get().haystackService
          if (haystackService == null) return
          haystackService.removeCanvasWorkspace(uniqueId)
          if (get().currentCanvasWorkspace?.uniqueId === uniqueId) {
            set({ currentCanvasWorkspace: null, canvasWorkspaceIsDirty: false })
          }
        },
        setCanvasWorkspaces(canvasWorkspaces) {
          set({ canvasWorkspaces })
        },
        loadCanvasWorkspaces() {
          const haystackService = get().haystackService
          if (haystackService == null) return
          const canvasWorkspaces = haystackService.loadCanvasWorkspaces()
          set({ canvasWorkspaces })
        },
        setCamera(cameraPosition) {
          set({ canvasCamera: cameraPosition })
          RendererManager.getInstance().setCameraPosition(cameraPosition)
        },
        getParentContainerForElement(element) {
          const haystackService = get().haystackService
          if (haystackService == null) return null
          const window = getWindow(element)
          if (window == null) return null

          return haystackService.getContainer(window)
        },
        setShouldRespondToCloseEvents(editorId, shouldRespondToCloseEvents) {
          const idToEditorMap = new Map(get().idToEditorMap)
          const editor = idToEditorMap.get(editorId)
          if (editor == null) return
          idToEditorMap.set(editorId, {
            ...editor,
            shouldRespondToCloseEvents,
          })
          set({ idToEditorMap })
        },
        respondToEditorClosing(editorIdentifier) {
          const openEditors = new Set(get().openEditors)
          const idToEditorMap = new Map(get().idToEditorMap)

          for (const editor of get().idToEditorMap.values()) {
            if (
              (editor.type === CanvasEditorType.CODE_EDITOR ||
                editor.type === CanvasEditorType.DIFF_EDITOR ||
                editor.type === CanvasEditorType.MODAL_EDITOR ||
                editor.type === CanvasEditorType.GHOST_EDITOR) &&
              editor.identifier?.editor.editorId ===
              editorIdentifier.editor.editorId &&
              editor.identifier?.groupId === editorIdentifier.groupId
            ) {
              // Incredibly hacky, but we only reject one close event.
              if (!editor.shouldRespondToCloseEvents) {
                idToEditorMap.set(editor.uuid, {
                  ...editor,
                  shouldRespondToCloseEvents: true,
                })
                continue
              }

              idToEditorMap.delete(editor.uuid)
            }
          }

          openEditors.delete(editorIdentifier)
          set({ openEditors, idToEditorMap })
        },
        respondToCodeEditorClosing(codeEditor) {
          const idToEditorMap = new Map(get().idToEditorMap)

          for (const editor of get().idToEditorMap.values()) {
            if (
              editor.type === CanvasEditorType.REFERENCES_EDITOR &&
              editor.codeEditor === codeEditor
            ) {
              idToEditorMap.delete(editor.uuid)
            }
          }

          set({ idToEditorMap })
        },
        async closeReferencesEditor(editorId, codeEditor) {
          const idToEditorMap = new Map(get().idToEditorMap)
          const selection = new Set(get().selection)

          selection.delete(editorId)
          idToEditorMap.delete(editorId)

          set({
            idToEditorMap,
            selection,
            editorToFocus: "",
          })

          await get().haystackServiceIsInitialized.p
          const haystackService = get().haystackService
          if (haystackService == null) return

          const referencesController = ReferencesController.get(codeEditor)
          referencesController?.closeWidget()
          get().sendTelemetry("editor closed", {
            editorId: editorId,
            editorType: "references editor",
          })
        },
        async closeAllEditors() {
          await get().haystackServiceIsInitialized.p

          const haystackService = get().haystackService
          if (haystackService == null) return

          const result = await haystackService.showConfirmationDialog(
            "Close all editors?",
            "This will close every editor on the canvas. Are you sure you want to proceed?",
            "Close all editors",
          )

          if (result === ConfirmResult.CANCEL) return

          // Iterate through each identifier and close the editor/delete the editor. We do this individually
          // so that no editors are left in an odd state (i.e. an all-or-nothing transition might be stuck on a confirmation modal).
          for (const editor of get().idToEditorMap.values()) {
            // Ignore pinned editors.
            if (editor.isPinned) continue

            if (
              (editor.type === CanvasEditorType.CODE_EDITOR ||
                editor.type === CanvasEditorType.DIFF_EDITOR ||
                editor.type === CanvasEditorType.MODAL_EDITOR ||
                editor.type === CanvasEditorType.GHOST_EDITOR) &&
              editor.identifier != null
            ) {
              let editor_type
              if (editor.type == CanvasEditorType.CODE_EDITOR) {
                editor_type = "code"
              } else if (editor.type == CanvasEditorType.GHOST_EDITOR) {
                editor_type = "ghost"
              } else if (editor.type == CanvasEditorType.DIFF_EDITOR) {
                editor_type = "diff"
              }
              get().sendTelemetry("editor closed", {
                editorId: editor.uuid,
                editorType: editor_type,
              })
              if (
                await haystackService.closeEditor(editor.identifier, {
                  closeUnconditionally:
                    editor.type === CanvasEditorType.GHOST_EDITOR &&
                    editor.isGhost,
                })
              ) {
                // Grabs a fresh editor ID to editor map.
                const idToEditorMap = new Map(get().idToEditorMap)
                idToEditorMap.delete(editor.uuid)
                // To prevent stale state (because the await above is unbounded due to needing user input),
                // we must set the state per iteration.
                set({ idToEditorMap })
              } else {
              }
            } else {
              const idToEditorMap = new Map(get().idToEditorMap)
              idToEditorMap.delete(editor.uuid)
              // To prevent stale state (because the await above is unbounded due to needing user input),
              // we must set the state per iteration.
              set({ idToEditorMap })
            }
          }

          set({ selection: new Set() })
        },
        async rearrangeAllEditors() {
          const spatialSortMiddleware = middlewareManager.getMiddleware(
            MiddlewareType.SPATIAL_SORT,
          ) as SpatialSortMiddleware
          const sortedEditors = spatialSortMiddleware.getSortedEditors()
          const haystackService = get().haystackService
          if (haystackService == null) return

          const idToEditorMap: Map<string, CanvasEditor> = new Map()
          if (sortedEditors.length === 0) return

          const firstEditorPositionInViewport = get().getEditorPosition(
            sortedEditors[0].uuid,
          )

          for (const sortedEditor of sortedEditors) {
            let sizePromise: Promise<Vector> | null = null
            if (
              sortedEditor.type === CanvasEditorType.CODE_EDITOR ||
              sortedEditor.type === CanvasEditorType.GHOST_EDITOR
            ) {
              if (sortedEditor.editRange == null) {
                sizePromise = getEditorSizeForFile(
                  sortedEditor.uri,
                  haystackService,
                )
              } else {
                sizePromise = getEditorSizeForSymbol(
                  sortedEditor.uri,
                  sortedEditor.editRange,
                  haystackService,
                )
              }
            }

            const position = this.getPositionForNewEditor(
              firstEditorPositionInViewport,
              new Vector(sortedEditor.width, sortedEditor.height),
              idToEditorMap,
            )

            const size = sizePromise
              ? await sizePromise
              : new Vector(sortedEditor.width, sortedEditor.height)

            idToEditorMap.set(sortedEditor.uuid, {
              ...sortedEditor,
              xPosition: position.x,
              yPosition: position.y,
              width: size.x,
              height: size.y,
            })
          }

          set({ idToEditorMap })
        },
        setCanvasWorkspaceDirty(isDirty) {
          set({ canvasWorkspaceIsDirty: isDirty })
        },
        showConfirmationDialog(message, detail, yesLabel, noLabel) {
          const haystackService = get().haystackService
          if (haystackService == null) {
            return Promise.resolve(ConfirmResult.CANCEL)
          }

          return haystackService.showConfirmationDialog(
            message,
            detail,
            yesLabel,
            noLabel,
          )
        },
        async getHideCanvasDots() {
          await get().haystackServiceIsInitialized.p

          const haystackService = get().haystackService
          if (haystackService == null) return false

          return haystackService.getHideCanvasDots()
        },
        async refreshEditRange(editorId) {
          const idToEditorMap = new Map(get().idToEditorMap)
          const haystackService = get().haystackService
          const editor = idToEditorMap.get(editorId) as
            | CanvasCodeEditor
            | undefined
          if (
            haystackService == null ||
            editor == null ||
            editor.editRange == null
          ) {
            return
          }

          const symbol = await haystackService.getSymbolAtPosition({
            uri: URI.file(editor.filePath),
            range: editor.editRange,
          })

          if (symbol == null) {
            idToEditorMap.set(editorId, { ...editor, editRange: null })
          } else {
            idToEditorMap.set(editorId, { ...editor, editRange: symbol.range })
          }

          set({ idToEditorMap })
        },
        async getTextModelRef(uri) {
          const haystackService = get().haystackService
          if (haystackService == null) return null
          return haystackService.getOrCreateTextModelRef(uri)
        },
        setOpenAiSettings(openAiSettings) {
          const haystackService = get().haystackService
          haystackService?.storeOpenAiSettings(openAiSettings)
          set({ openAiSettings })
        },
        setFloatingToolbarElement(element) {
          set({ floatingToolbarElement: element })
        },
        focusOnEditorContainer() {
          const editorId = get().focusedEditorId
          if (editorId == null) return

          const editor = get().idToEditorMap.get(editorId)
          if (
            editor == null ||
            editor.type === CanvasEditorType.REFERENCES_EDITOR ||
            editor.editorContainer == null
          ) {
            return
          }

          editor.editorContainer.focus()
        },
        setEditorContainer(editorId, editorContainer) {
          const editor = get().idToEditorMap.get(editorId) as
            | CanvasCodeEditor
            | undefined
          if (editor == null) return

          const idToEditorMap = new Map(get().idToEditorMap)
          idToEditorMap.set(editorId, { ...editor, editorContainer })
          set({ idToEditorMap })
        },
        pushToEditorHistoryStack(editorId) {
          // We don't want canvas focus to pollute the history stack, as
          // in most cases the user would not want to refocus on the canvas.
          if (
            get().previousEditorHistoryStack.length >= 1 &&
            editorId == null
          ) {
            return
          }

          const editorHistoryStack = [...get().previousEditorHistoryStack]
          if (
            editorHistoryStack.length > 1 &&
            editorHistoryStack[editorHistoryStack.length - 1] === editorId
          ) {
            return
          }
          editorHistoryStack.push(editorId)
          set({
            previousEditorHistoryStack: editorHistoryStack,
            nextEditorHistoryStack: [],
          })
        },
        pushToEditorSelectionHistory(editorId, selection) {
          const previousEditorSelectionHistoryMap = new Map(
            get().previousEditorSelectionHistoryMap,
          )
          const nextEditorSelectionHistoryMap = new Map(
            get().previousEditorSelectionHistoryMap,
          )

          const selectionHistory =
            previousEditorSelectionHistoryMap.get(editorId) ?? []

          previousEditorSelectionHistoryMap.set(editorId, [
            ...selectionHistory,
            selection,
          ])
          nextEditorSelectionHistoryMap.set(editorId, [])

          set({
            previousEditorSelectionHistoryMap,
            nextEditorSelectionHistoryMap,
          })
        },
        goToPreviousEditorInHistoryStack() {
          const editorHistoryStack = [...get().previousEditorHistoryStack]
          let previouseditorId = editorHistoryStack.pop()
          while (
            previouseditorId != null &&
            get().idToEditorMap.get(previouseditorId) == null
          ) {
            previouseditorId = editorHistoryStack.pop()
          }
          const nextEditorHistoryStack = [...get().nextEditorHistoryStack]
          nextEditorHistoryStack.push(get().focusedEditorId)

          set({
            previousEditorHistoryStack: editorHistoryStack,
            nextEditorHistoryStack,
            focusedEditorId: previouseditorId,
          })
          get().haystackService?.setNavigationButtonState(
            get().previousEditorHistoryStack.length,
            get().nextEditorHistoryStack.length,
          )

          if (previouseditorId == null) {
            get().focusOnCanvas()
            return
          }

          const editor = get().idToEditorMap.get(previouseditorId)
          if (editor == null) return

          get().navigateToEditor(editor, NavigationType.JUST_ENOUGH)
          // Needed because the focus is no longer inside the React application.
          get().focusOnEditor(previouseditorId)
        },
        goToNextEditorInHistoryStack() {
          const editorHistoryStack = [...get().nextEditorHistoryStack]
          let nexteditorId = editorHistoryStack.pop()
          while (
            nexteditorId != null &&
            get().idToEditorMap.get(nexteditorId) == null
          ) {
            nexteditorId = editorHistoryStack.pop()
          }
          const previousEditorHistoryStack = [
            ...get().previousEditorHistoryStack,
          ]
          previousEditorHistoryStack.push(get().focusedEditorId)
          set({
            nextEditorHistoryStack: editorHistoryStack,
            previousEditorHistoryStack,
            focusedEditorId: nexteditorId,
          })
          get().haystackService?.setNavigationButtonState(
            get().previousEditorHistoryStack.length,
            get().nextEditorHistoryStack.length,
          )

          if (nexteditorId == null) return
          const editor = get().idToEditorMap.get(nexteditorId)
          if (editor == null) return

          get().navigateToEditor(editor, NavigationType.JUST_ENOUGH)
          // Needed because the focus is no longer inside the React application.
          get().focusOnEditor(nexteditorId)
        },
        goToPreviousEditorSelection(editorId) {
          const editor = get().idToEditorMap.get(editorId) as
            | CanvasCodeEditor
            | undefined
          if (editor == null) return

          const previousEditorSelectionHistoryMap = new Map(
            get().previousEditorSelectionHistoryMap,
          )
          const nextEditorSelectionHistoryMap = new Map(
            get().nextEditorSelectionHistoryMap,
          )

          const previousSelectionHistory =
            previousEditorSelectionHistoryMap.get(editorId) ?? []
          const selection = previousSelectionHistory.pop()
          if (selection == null) return

          // Sets the editor selection.
          const idToEditorMap = new Map(get().idToEditorMap)
          idToEditorMap.set(editorId, { ...editor, selectionRange: selection })
          set({ idToEditorMap })

          // Sets the editor selection.
          const haystackService = get().haystackService
          if (haystackService != null && editor.identifier != null) {
            haystackService.setEditorSelection(editor.identifier, selection)
          }

          const nextSelectionHistory =
            nextEditorSelectionHistoryMap.get(editorId) ?? []
          if (editor.selectionRange != null) {
            nextSelectionHistory.push(editor.selectionRange)
          }

          previousEditorSelectionHistoryMap.set(editorId, [
            ...previousSelectionHistory,
          ])
          nextEditorSelectionHistoryMap.set(editorId, [...nextSelectionHistory])

          set({
            previousEditorSelectionHistoryMap,
            nextEditorSelectionHistoryMap,
          })
        },
        goToNextEditorSelection(editorId) {
          const editor = get().idToEditorMap.get(editorId) as
            | CanvasCodeEditor
            | undefined
          if (editor == null) return

          const previousEditorSelectionHistoryMap = new Map(
            get().previousEditorSelectionHistoryMap,
          )
          const nextEditorSelectionHistoryMap = new Map(
            get().nextEditorSelectionHistoryMap,
          )

          const nextSelectionHistory =
            nextEditorSelectionHistoryMap.get(editorId) ?? []
          const selection = nextSelectionHistory.pop()
          if (selection == null) return

          // Sets the editor selection.
          const idToEditorMap = new Map(get().idToEditorMap)
          idToEditorMap.set(editorId, { ...editor, selectionRange: selection })
          set({ idToEditorMap })

          // Sets the editor selection.
          const haystackService = get().haystackService
          if (haystackService != null && editor.identifier != null) {
            haystackService.setEditorSelection(editor.identifier, selection)
          }

          const previousSelectionHistory =
            previousEditorSelectionHistoryMap.get(editorId) ?? []
          if (editor.selectionRange != null) {
            previousSelectionHistory.push(editor.selectionRange)
          }

          nextEditorSelectionHistoryMap.set(editorId, [...nextSelectionHistory])
          previousEditorSelectionHistoryMap.set(editorId, [
            ...previousSelectionHistory,
          ])

          set({
            previousEditorSelectionHistoryMap,
            nextEditorSelectionHistoryMap,
          })
        },
        cleanHistoryStacks(idToEditorMap) {
          const previousEditorHistoryStack: (string | null)[] = []

          for (const editorId of get().previousEditorHistoryStack) {
            if (editorId == null) {
              previousEditorHistoryStack.push(editorId)
              continue
            }

            if (idToEditorMap.has(editorId)) {
              previousEditorHistoryStack.push(editorId)
            }
          }

          // We don't want a canvas focus entry in the previous history stack
          // if the user has deleted all editors in the history stack.
          if (
            get().focusedEditorId == null &&
            previousEditorHistoryStack.length === 1 &&
            previousEditorHistoryStack[0] == null
          ) {
            previousEditorHistoryStack.pop()
          }

          // Clear the next editor history stack if the previous stack
          // was altered.
          if (
            previousEditorHistoryStack.length !==
            get().previousEditorHistoryStack.length
          ) {
            set({ nextEditorHistoryStack: [] })
          }

          set({ previousEditorHistoryStack })
        },
        getKeybindingForCommand(commandId) {
          const haystackService = get().haystackService
          if (haystackService == null) return undefined

          return haystackService.getKeybindingForCommand(commandId)
        },
        getKeybindingForShortcut(scanCodeChord, keyChord) {
          const haystackService = get().haystackService
          if (haystackService == null) return undefined

          return haystackService.getKeybindingForShortcut(
            scanCodeChord,
            keyChord,
          )
        },
        setDependencyListType(editorId, dependencyListType) {
          const editor = get().idToEditorMap.get(editorId)
          if (
            editor == null ||
            (editor.type !== CanvasEditorType.CODE_EDITOR &&
              editor.type !== CanvasEditorType.GHOST_EDITOR) ||
            editor.dependencyListType === dependencyListType
          ) {
            return
          }

          if (dependencyListType == null) {
            get().sendTelemetry("Closed dependency list")
          } else {
            get().sendTelemetry(
              `opened ${dependencyListType === SymbolDepsType.INCOMING
                ? "incoming"
                : "outgoing"
              } dependencies`,
              {
                editorId: editorId,
              },
            )
          }

          const idToEditorMap = new Map(get().idToEditorMap)
          idToEditorMap.set(editorId, { ...editor, dependencyListType })
          set({ idToEditorMap })
        },
        pinCurrentEditor() {
          const focusedEditorId = get().focusedEditorId
          if (focusedEditorId == null) return

          const editor = get().idToEditorMap.get(focusedEditorId)
          if (editor == null) return

          if (editor.isPinned) {
            get().unpinCurrentEditor()
            return
          }

          get().sendTelemetry("pinned editor", {
            editorId: editor.uuid,
          })

          const idToEditorMap = new Map(get().idToEditorMap)

          let combinedPinnedWidth = 0
          let combinedPinnedHeight = 0
          for (const editor of idToEditorMap.values()) {
            if (editor.isPinned) {
              combinedPinnedWidth += editor.vWidth + VIEWPORT_PADDING
              combinedPinnedHeight += editor.vHeight + VIEWPORT_PADDING
            }
          }

          const viewportPosition = new Vector(
            VIEWPORT_PADDING,
            VIEWPORT_PADDING * 2,
          )
          const viewportSize =
            getViewportDimensionsWithPadding().sub(viewportPosition)

          let pinnedSize: Vector = Vector.new()

          if (editor.vWidth === 0 || editor.vHeight === 0) {
            // Make the pinned editor size as large as possible.
            pinnedSize = new Vector(
              viewportSize.x - combinedPinnedWidth,
              viewportSize.y,
            )
          } else {
            pinnedSize = new Vector(editor.vWidth, editor.vHeight)
          }

          const pinnedPosition = get().getViewportPositionForPinnedEditor(
            viewportPosition,
            pinnedSize,
            idToEditorMap,
          )

          idToEditorMap.set(focusedEditorId, {
            ...editor,
            isPinned: true,
            vxPosition: pinnedPosition.x,
            vyPosition: pinnedPosition.y,
            vWidth: pinnedSize.x,
            vHeight: pinnedSize.y,
          })

          set({ idToEditorMap })
        },
        unpinCurrentEditor() {
          const focusedEditorId = get().focusedEditorId
          if (focusedEditorId == null) return

          const editor = get().idToEditorMap.get(focusedEditorId)
          if (editor == null || !editor.isPinned) return

          get().sendTelemetry("unpinned editor", {
            editorId: editor.uuid,
          })

          const idToEditorMap = new Map(get().idToEditorMap)

          // Important that we delete for collision detection to work
          // correctly.
          idToEditorMap.delete(focusedEditorId)

          const upperLeftQuadrant = getUpperLeftQuadrantViewport()
          const unpinnedPosition = get().getPositionForNewEditor(
            upperLeftQuadrant,
            new Vector(editor.width, editor.height),
            idToEditorMap,
          )

          idToEditorMap.set(focusedEditorId, {
            ...editor,
            isPinned: false,
            xPosition: unpinnedPosition.x,
            yPosition: unpinnedPosition.y,
          })
          set({ idToEditorMap })
        },
        getPinnedBoundingBoxes() {
          const idToEditorMap = get().idToEditorMap
          const pinnedEditors = Array.from(idToEditorMap.values()).filter(
            (editor) => editor.isPinned,
          )

          return pinnedEditors.map((editor) => {
            return Rectangle.fromPositionAndSize(
              new Vector(editor.vxPosition, editor.vyPosition),
              new Vector(editor.width, editor.height),
            )
          })
        },
        setCurrentSymbol(editorId, documentSymbol) {
          const editor = get().idToEditorMap.get(editorId)
          if (
            editor == null ||
            editor.type !== CanvasEditorType.CODE_EDITOR ||
            editor.currentSymbol === documentSymbol
          ) {
            return
          }

          const idToEditorMap = new Map(get().idToEditorMap)
          const haystackService = get().haystackService
          if (
            haystackService == null ||
            !haystackService.getEnableSymbolAtFileSelection()
          ) {
            idToEditorMap.set(editorId, { ...editor, currentSymbol: null })
            set({ idToEditorMap })
            return
          }

          if (
            Range.equalsRange(
              documentSymbol?.range,
              editor.currentSymbol?.range,
            )
          ) {
            return
          }

          idToEditorMap.set(editorId, {
            ...editor,
            currentSymbol: documentSymbol,
          })
          set({ idToEditorMap })
        },
        canMiddleClickToCloseEditors() {
          const haystackService = get().haystackService
          if (haystackService == null) return false
          return haystackService.getCanMiddleClickToCloseEditors()
        },
        focusOnEditorWithWebview(origin) {
          for (const editor of get().idToEditorMap.values()) {
            const modalWebviewMatch =
              editor.type === CanvasEditorType.MODAL_EDITOR &&
              ((editor.input instanceof WebviewInput &&
                editor.input.webview.origin === origin) ||
                (editor.input instanceof ExtensionsInput &&
                  editor.input.webviewOrigin === origin))

            const codeWebviewMatch =
              editor.type === CanvasEditorType.CODE_EDITOR &&
              ((editor.webviewEditor != null &&
                (editor.webviewEditor.input as WebviewInput).webview.origin ===
                origin) ||
                (editor.notebookEditor != null &&
                  editor.notebookEditor.getInnerWebview()?.origin === origin))

            if (modalWebviewMatch || codeWebviewMatch) {
              const selection = new Set<string>()
              selection.add(editor.uuid)
              set({ selection, focusedEditorId: editor.uuid })
              get().navigateToEditor(editor, NavigationType.JUST_ENOUGH)
              return
            }
          }
        },
        blurEditorWithWebview(origin) {
          for (const editor of get().idToEditorMap.values()) {
            if (
              editor.type === CanvasEditorType.MODAL_EDITOR &&
              editor.input instanceof WebviewInput &&
              editor.input.webview.origin === origin
            ) {
              if (get().focusedEditorId === editor.uuid) {
                set({ focusedEditorId: null })
              }
              return
            }
          }
        },
        focusOnNotebookEditor(notebookEditor) {
          for (const editor of get().idToEditorMap.values()) {
            if (
              editor.type === CanvasEditorType.CODE_EDITOR &&
              editor.notebookEditor === notebookEditor
            ) {
              const selection = new Set<string>()
              selection.add(editor.uuid)
              set({ selection, focusedEditorId: editor.uuid })
              get().navigateToEditor(editor, NavigationType.JUST_ENOUGH)
              return
            }
          }
        },
        blurNotebookEditor(notebookEditor) {
          for (const editor of get().idToEditorMap.values()) {
            if (
              editor.type === CanvasEditorType.CODE_EDITOR &&
              editor.notebookEditor === notebookEditor
            ) {
              if (get().focusedEditorId === editor.uuid) {
                set({ focusedEditorId: null })
              }
              return
            }
          }
        },
        replaceEditorWithIdentifier(editorIdentifier, uri) {
          for (const editor of get().idToEditorMap.values()) {
            if (
              editor.type === CanvasEditorType.CODE_EDITOR ||
              editor.type === CanvasEditorType.DIFF_EDITOR ||
              editor.type === CanvasEditorType.MODAL_EDITOR ||
              editor.type === CanvasEditorType.GHOST_EDITOR
            ) {
              if (editor.identifier == null) continue
              if (
                editor.identifier.editor.editorId ===
                editorIdentifier.editor.editorId &&
                editor.identifier.groupId === editorIdentifier.groupId
              ) {
                const idToEditorMap = new Map(get().idToEditorMap)
                if (
                  editor.type === CanvasEditorType.CODE_EDITOR ||
                  editor.type === CanvasEditorType.GHOST_EDITOR
                ) {
                  editor.uri = uri
                }

                if (editor.type !== CanvasEditorType.MODAL_EDITOR) {
                  editor.filePath = uri.path
                }

                idToEditorMap.set(editor.uuid, {
                  ...editor,
                  shouldRespondToCloseEvents: false,
                })
                set({ idToEditorMap })
                get().navigateToEditor(editor, NavigationType.CENTER)
                return true
              }
            }
          }

          return false
        },
        setShowNavigationBar(showNavigationBar) {
          set({ showNavigationBar })
        },
      })),
    ),
  )
}

function generateEditor(
  editorArgs: FinalEditorArgs,
  canvasScale: number,
): CanvasEditor | null {
  switch (editorArgs.type) {
    case CanvasEditorType.CODE_EDITOR: {
      const editorDimensions = Vector.min(
        getViewportDimensionsWithPadding(),
        new Vector(DEFAULT_EDITOR_WIDTH, EMPTY_EDITOR_HEIGHT),
      )
      const [editorWidth, editorHeight] = [
        editorDimensions.x,
        editorDimensions.y,
      ]
      return {
        type: CanvasEditorType.CODE_EDITOR,
        uuid: editorArgs.uuid,
        isDirty: false,
        xPosition:
          editorArgs.xPosition -
          (editorArgs.positionByCenter ? (editorWidth / 2) * canvasScale : 0),
        yPosition:
          editorArgs.yPosition -
          (editorArgs.positionByCenter ? (editorHeight / 2) * canvasScale : 0),
        vxPosition: VIEWPORT_PADDING,
        vyPosition: VIEWPORT_PADDING,
        vWidth: 0,
        vHeight: 0,
        width: editorArgs.width ?? editorWidth,
        height: editorArgs.height ?? editorHeight,
        symbolName: editorArgs.symbolName ?? null,
        symbolType: editorArgs.symbolType ?? null,
        editRange: editorArgs.range ?? null,
        filePath: editorArgs.filePath,
        uri: editorArgs.uri,
        selectionRange: editorArgs.selectionRange ?? null,
        scrollPosition: editorArgs.scrollPosition ?? null,
        isGhost: false,
        isShowingCancellationModal: false,
        identifier: null,
        highlightRange: editorArgs.highlightRange ?? null,
        options: editorArgs.options ?? null,
        existingEditorInput: editorArgs.existingEditorInput ?? null,
        zIndex: 3,
        hasResized: false,
        isPinned: false,
        deferredPanePromise: editorArgs.editorPanePromise ?? null,
        shouldRespondToCloseEvents: true,
        editorContainer: null,
        dependencyListType: null,
        currentSymbol: null,
        notebookEditor: null,
        webviewEditor: null,
      }
    }
    case CanvasEditorType.DIFF_EDITOR: {
      const editorDimensions = Vector.min(
        getViewportDimensionsWithPadding(),
        new Vector(DEFAULT_DIFF_EDITOR_WIDTH, EMPTY_EDITOR_HEIGHT),
      )
      const [editorWidth, editorHeight] = [
        editorDimensions.x,
        editorDimensions.y,
      ]
      return {
        type: CanvasEditorType.DIFF_EDITOR,
        isDirty: false,
        uuid: editorArgs.uuid,
        xPosition:
          editorArgs.xPosition -
          (editorArgs.positionByCenter ? (editorWidth / 2) * canvasScale : 0),
        yPosition:
          editorArgs.yPosition -
          (editorArgs.positionByCenter ? (editorHeight / 2) * canvasScale : 0),
        vxPosition: VIEWPORT_PADDING,
        vyPosition: VIEWPORT_PADDING,
        vWidth: 0,
        vHeight: 0,
        width: editorArgs.width ?? editorWidth,
        height: editorArgs.height ?? editorHeight,
        filePath: editorArgs.filePath,
        selectionRange: editorArgs.selectionRange ?? null,
        scrollPosition: editorArgs.scrollPosition ?? null,
        isGhost: false,
        isShowingCancellationModal: false,
        identifier: null,
        highlightRange: editorArgs.highlightRange ?? null,
        originalUri: editorArgs.originalUri,
        modifiedUri: editorArgs.modifiedUri,
        options: editorArgs.options ?? null,
        existingEditorInput: editorArgs.existingEditorInput ?? null,
        zIndex: 3,
        editRange: null,
        symbolName: null,
        symbolType: null,
        hasResized: false,
        isPinned: false,
        deferredPanePromise: editorArgs.editorPanePromise ?? null,
        shouldRespondToCloseEvents: true,
        editorContainer: null,
        currentSymbol: null,
      }
    }
    case CanvasEditorType.GHOST_EDITOR: {
      const editorDimensions = Vector.min(
        getViewportDimensionsWithPadding(),
        new Vector(DEFAULT_DIFF_EDITOR_WIDTH, EMPTY_EDITOR_HEIGHT),
      )
      const [editorWidth, editorHeight] = [
        editorDimensions.x,
        editorDimensions.y,
      ]
      return {
        type: CanvasEditorType.GHOST_EDITOR,
        uuid: editorArgs.uuid,
        isDirty: false,
        xPosition:
          editorArgs.xPosition -
          (editorArgs.positionByCenter ? (editorWidth / 2) * canvasScale : 0),
        yPosition:
          editorArgs.yPosition -
          (editorArgs.positionByCenter ? (editorHeight / 2) * canvasScale : 0),
        vxPosition: VIEWPORT_PADDING,
        vyPosition: VIEWPORT_PADDING,
        vWidth: 0,
        vHeight: 0,
        width: editorArgs.width ?? editorWidth,
        height: editorArgs.height ?? editorHeight,
        symbolName: editorArgs.symbolName ?? null,
        symbolType: editorArgs.symbolType ?? null,
        filePath: editorArgs.filePath,
        uri: editorArgs.uri,
        selectionRange: editorArgs.selectionRange ?? null,
        editRange: editorArgs.range ?? null,
        scrollPosition: editorArgs.scrollPosition ?? null,
        isGhost: true,
        isShowingCancellationModal: false,
        identifier: null,
        highlightRange: editorArgs.highlightRange ?? null,
        options: editorArgs.options ?? null,
        existingEditorInput: editorArgs.existingEditorInput ?? null,
        value: editorArgs.value,
        zIndex: 3,
        hasResized: false,
        isPinned: false,
        deferredPanePromise: editorArgs.editorPanePromise ?? null,
        shouldRespondToCloseEvents: true,
        editorContainer: null,
        dependencyListType: null,
        currentSymbol: null,
      }
    }
    case CanvasEditorType.MODAL_EDITOR: {
      const editorDimensions = Vector.min(
        getViewportDimensionsWithPadding(),
        new Vector(DEFAULT_DIFF_EDITOR_WIDTH, EMPTY_EDITOR_HEIGHT),
      )
      const [editorWidth, editorHeight] = [
        editorDimensions.x,
        editorDimensions.y,
      ]
      return {
        type: CanvasEditorType.MODAL_EDITOR,
        uuid: editorArgs.uuid,
        isDirty: false,
        xPosition:
          editorArgs.xPosition -
          (editorArgs.positionByCenter ? (editorWidth / 2) * canvasScale : 0),
        yPosition:
          editorArgs.yPosition -
          (editorArgs.positionByCenter ? (editorHeight / 2) * canvasScale : 0),
        vxPosition: VIEWPORT_PADDING,
        vyPosition: VIEWPORT_PADDING,
        vWidth: 0,
        vHeight: 0,
        width: editorArgs.width ?? editorWidth,
        height: editorArgs.height ?? editorHeight,
        selectionRange: editorArgs.selectionRange ?? null,
        scrollPosition: editorArgs.scrollPosition ?? null,
        isGhost: false,
        isShowingCancellationModal: false,
        identifier: null,
        highlightRange: editorArgs.highlightRange ?? null,
        options: editorArgs.options ?? null,
        existingEditorInput: editorArgs.existingEditorInput ?? null,
        zIndex: 3,
        hasResized: false,
        isPinned: false,
        editRange: null,
        symbolName: null,
        symbolType: null,
        input: editorArgs.editorInput,
        deferredPanePromise: editorArgs.editorPanePromise ?? null,
        editorPane: null,
        shouldRespondToCloseEvents: true,
        editorContainer: null,
        currentSymbol: null,
      }
    }
    case CanvasEditorType.MERGE_EDITOR: {
      const editorDimensions = Vector.min(
        getViewportDimensionsWithPadding(),
        new Vector(DEFAULT_DIFF_EDITOR_WIDTH, EMPTY_EDITOR_HEIGHT),
      )
      const [editorWidth, editorHeight] = [
        editorDimensions.x,
        editorDimensions.y,
      ]
      return {
        type: CanvasEditorType.MERGE_EDITOR,
        uuid: editorArgs.uuid,
        isDirty: false,
        xPosition:
          editorArgs.xPosition -
          (editorArgs.positionByCenter ? (editorWidth / 2) * canvasScale : 0),
        yPosition:
          editorArgs.yPosition -
          (editorArgs.positionByCenter ? (editorHeight / 2) * canvasScale : 0),
        vxPosition: VIEWPORT_PADDING,
        vyPosition: VIEWPORT_PADDING,
        vWidth: 0,
        vHeight: 0,
        width: editorArgs.width ?? editorWidth,
        height: editorArgs.height ?? editorHeight,
        selectionRange: editorArgs.selectionRange ?? null,
        scrollPosition: editorArgs.scrollPosition ?? null,
        isGhost: false,
        isShowingCancellationModal: false,
        identifier: null,
        highlightRange: editorArgs.highlightRange ?? null,
        options: editorArgs.options ?? null,
        existingEditorInput: editorArgs.existingEditorInput ?? null,
        zIndex: 3,
        hasResized: false,
        isPinned: false,
        editRange: null,
        symbolName: null,
        symbolType: null,
        input: editorArgs.editorInput,
        deferredPanePromise: editorArgs.editorPanePromise ?? null,
        editorPane: null,
        shouldRespondToCloseEvents: true,
        editorContainer: null,
        currentSymbol: null,
      }
    }
    case CanvasEditorType.REFERENCES_EDITOR: {
      const editorDimensions = Vector.min(
        getViewportDimensionsWithPadding(),
        new Vector(DEFAULT_EDITOR_WIDTH, EMPTY_EDITOR_HEIGHT),
      )
      const [editorWidth, editorHeight] = [
        editorDimensions.x,
        editorDimensions.y,
      ]
      return {
        type: CanvasEditorType.REFERENCES_EDITOR,
        uuid: editorArgs.uuid,
        xPosition:
          editorArgs.xPosition -
          (editorArgs.positionByCenter ? (editorWidth / 2) * canvasScale : 0),
        yPosition:
          editorArgs.yPosition -
          (editorArgs.positionByCenter ? (editorHeight / 2) * canvasScale : 0),
        vxPosition: VIEWPORT_PADDING,
        vyPosition: VIEWPORT_PADDING,
        vWidth: 0,
        vHeight: 0,
        width: editorArgs.width ?? editorWidth,
        height: editorArgs.height ?? editorHeight,
        codeEditor: editorArgs.codeEditor,
        referencesModel: editorArgs.referencesModel,
        range: editorArgs.range,
        isGhost: false,
        hasResized: false,
        isPinned: false,
        currentReferenceUri: null,
        numberOfReferences: null,
        isDirty: false,
        isClosing: false,
        shouldRespondToCloseEvents: true,
        referencesWidget: null,
      }
    }
    case CanvasEditorType.COPILOT_SETTINGS_EDITOR: {
      const editorDimensions = Vector.min(
        getViewportDimensionsWithPadding(),
        new Vector(DEFAULT_EDITOR_WIDTH, EMPTY_EDITOR_HEIGHT),
      )
      const [editorWidth, editorHeight] = [
        editorDimensions.x,
        editorDimensions.y,
      ]
      return {
        type: CanvasEditorType.COPILOT_SETTINGS_EDITOR,
        uuid: editorArgs.uuid,
        xPosition:
          editorArgs.xPosition -
          (editorArgs.positionByCenter ? (editorWidth / 2) * canvasScale : 0),
        yPosition:
          editorArgs.yPosition -
          (editorArgs.positionByCenter ? (editorHeight / 2) * canvasScale : 0),
        vxPosition: VIEWPORT_PADDING,
        vyPosition: VIEWPORT_PADDING,
        vWidth: 0,
        vHeight: 0,
        width: editorArgs.width ?? editorWidth,
        height: editorArgs.height ?? editorHeight,
        isGhost: false,
        hasResized: false,
        isPinned: false,
        shouldRespondToCloseEvents: true,
        editorContainer: null,
        zIndex: 3,
      }
    }
    case CanvasEditorType.HAYSTACK_KEYBINDINGS_EDITOR: {
      const editorDimensions = Vector.min(
        getViewportDimensionsWithPadding(),
        new Vector(DEFAULT_EDITOR_WIDTH, EMPTY_EDITOR_HEIGHT),
      )
      const [editorWidth, editorHeight] = [
        editorDimensions.x,
        editorDimensions.y,
      ]
      return {
        type: CanvasEditorType.HAYSTACK_KEYBINDINGS_EDITOR,
        uuid: editorArgs.uuid,
        xPosition:
          editorArgs.xPosition -
          (editorArgs.positionByCenter ? (editorWidth / 2) * canvasScale : 0),
        yPosition:
          editorArgs.yPosition -
          (editorArgs.positionByCenter ? (editorHeight / 2) * canvasScale : 0),
        vxPosition: VIEWPORT_PADDING,
        vyPosition: VIEWPORT_PADDING,
        vWidth: 0,
        vHeight: 0,
        width: editorArgs.width ?? editorWidth,
        height: editorArgs.height ?? editorHeight,
        isGhost: false,
        hasResized: false,
        isPinned: false,
        shouldRespondToCloseEvents: true,
        editorContainer: null,
        zIndex: 3,
      }
    }
  }
}

async function getEditorSizeForSymbol(
  uri: URI,
  range: IRange,
  haystackService: HaystackService,
): Promise<Vector> {
  if (haystackService == null) {
    return new Vector(
      DEFAULT_EDITOR_WIDTH,
      Math.min(
        (range.endLineNumber - range.startLineNumber + 1 + 5) * LINE_HEIGHT +
        HEADER_HEIGHT,
        RendererManager.getInstance().getViewportDimensionsWithDoublePadding()
          .y,
      ),
    )
  }

  const lineMetadata = await haystackService.getLineMetadataForFile(uri, range)
  const numLines = Math.max(5, lineMetadata.numLines)
  const lineNumberDecorationWidth = 73
  const longestLineWidth =
    Math.round((lineMetadata.longestLineColumn + 5) * 7.23) +
    lineNumberDecorationWidth

  const viewportBounds =
    RendererManager.getInstance().getViewportDimensionsWithDoublePadding()

  return new Vector(
    clamp(longestLineWidth, MIN_EDITOR_WIDTH, viewportBounds.x),
    Math.min((numLines + 5) * LINE_HEIGHT + HEADER_HEIGHT, viewportBounds.y),
  )
}

async function getEditorSizeForFile(
  uri: URI,
  haystackService: HaystackService,
): Promise<Vector> {
  if (haystackService == null) {
    return new Vector(
      DEFAULT_EDITOR_WIDTH,
      Math.min(
        (5 + 5) * LINE_HEIGHT + HEADER_HEIGHT,
        RendererManager.getInstance().getViewportDimensionsWithDoublePadding()
          .y,
      ),
    )
  }

  const lineMetadata = await haystackService.getLineMetadataForFile(uri)
  const numLines = Math.max(5, lineMetadata.numLines)
  const lineNumberDecorationWidth = 73
  const longestLineWidth =
    Math.round((lineMetadata.longestLineColumn + 5) * 7.23) +
    lineNumberDecorationWidth

  const viewportBounds =
    RendererManager.getInstance().getViewportDimensionsWithDoublePadding()

  return new Vector(
    clamp(longestLineWidth, MIN_EDITOR_WIDTH, viewportBounds.x),
    Math.min((numLines + 5) * LINE_HEIGHT + HEADER_HEIGHT, viewportBounds.y),
  )
}
