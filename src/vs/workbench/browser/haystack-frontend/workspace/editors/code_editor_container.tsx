/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { ResizableOptions } from "../../canvas/pointer_event_handlers/resize_handler"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { commitAction } from "vs/workbench/browser/haystack-frontend/canvas_utils/commit_action"
import {
  EditorHeader,
  HEADER_HEIGHT,
} from "vs/workbench/browser/haystack-frontend/editor/editor_header"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { useResizable } from "vs/workbench/browser/haystack-frontend/react_utils/create_resizable"
import {
  useEditorOnKeyDown,
  useEditorOnKeyDownCapture,
  useScrollHandler,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/editor_utils"
import * as React from "react"
import { ITextModel } from "vs/editor/common/model"
import "vs/css!./editors"
import { DocumentSymbol, SymbolKind } from "vs/editor/common/languages"
import { CodeEditor } from "vs/workbench/browser/haystack-frontend/editor/code_editor"
import {
  WorkspaceStoreWrapper,
  getSizeForEditor,
} from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { CallHierarchyProvider } from "vs/workbench/browser/haystack-frontend/workspace/utils/call_hierarchy_provider"
import { Position } from "vs/editor/common/core/position"
import { isCallableSymbol } from "vs/workbench/browser/haystack-frontend/react_utils/is_function_symbol"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { SymbolDepsButton } from "vs/workbench/browser/haystack-frontend/workspace/editors/symbol_deps_button"
import {
  INCOMING_DEPS_KEY,
  OUTGOING_DEPS_KEY,
  SymbolDepsType,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import { IRange, Range } from "vs/editor/common/core/range"
import { adjustRangeForComments } from "vs/workbench/services/haystack/common/haystackService"
import { ViewportNumberDisplay } from "vs/workbench/browser/haystack-frontend/workspace/editors/viewport_number_display"
import { MoveOptions } from "../../canvas/pointer_event_handlers/move_handler"
import { useMoveable } from "vs/workbench/browser/haystack-frontend/react_utils/create_moveable"
import { useMemoizedCanvasBoundingBox } from "vs/workbench/browser/haystack-frontend/react_utils/memoized_canvas_bounding_box"
import { canvasRef } from "vs/workbench/browser/haystack-frontend/root/app_common"
import { isNotableSymbol } from "vs/workbench/browser/haystack-frontend/react_utils/is_notable_symbol"
import { Dimension } from "vs/base/browser/dom"
import { CanvasCodeEditor } from "vs/workbench/browser/haystack-frontend/editor/editor"
import { useHandleBoundsKeyDown } from "vs/workbench/browser/haystack-frontend/workspace/editors/utils/bounds_handling"
import { SymbolDependencyList } from "vs/workbench/browser/haystack-frontend/workspace/editors/dependency_list"
import { SmallFileSvg } from "vs/workbench/browser/haystack-frontend/workspace/editors/svgs"
import { getSymbolIcon } from "vs/workbench/browser/haystack-frontend/workspace/editors/utils/get_symbol_icon"
import { usePrevious } from "../../react_utils/use_previous"

interface CodeEditorContainerProps {
  editorId: string
}

// This is a dummy container used to prevent overly re-rendering due to camera/editor
// position or dimensions changes.
export function CodeEditorContainer({ editorId }: CodeEditorContainerProps) {
  const editorPosition = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.getEditorPosition(editorId),
  )
  const {
    width,
    height,
    vWidth,
    vHeight,
    isPinned,
    notebookEditor,
    webviewEditor,
  } = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.idToEditorMap.get(editorId) as CanvasCodeEditor,
  )
  const boundingBox = useMemoizedCanvasBoundingBox()

  const scale = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.canvasScale,
  )
  const { zIndex } = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.idToEditorMap.get(editorId) as CanvasCodeEditor,
  )
  const isSelected = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.selection.has(editorId),
  )

  const previousNotebookEditor = usePrevious(
    notebookEditor,
    /* defaultToNull */ true,
  )

  React.useEffect(() => {
    if (notebookEditor == null) return

    // If the notebook editor is becoming visible for the first time,
    // focus it.
    if (previousNotebookEditor == null) {
      notebookEditor.focusWebview()
    }

    if (boundingBox == null) {
      notebookEditor.setVisible(false)
      return
    } else {
      notebookEditor.setVisible(true)
    }

    const layoutWidth = isPinned ? vWidth : width * scale
    const layoutHeight = isPinned
      ? vHeight - HEADER_HEIGHT - 2
      : (height - HEADER_HEIGHT - 2) * scale
    const layoutScaleFactor = isPinned ? 1 : scale

    notebookEditor.layout(new Dimension(layoutWidth, layoutHeight), {
      left: editorPosition.x + boundingBox.x + 2 * layoutScaleFactor,
      top:
        editorPosition.y +
        boundingBox.y +
        (HEADER_HEIGHT + 2) * layoutScaleFactor,
    })
  }, [
    notebookEditor,
    width,
    height,
    vWidth,
    vHeight,
    isPinned,
    boundingBox,
    editorPosition,
    scale,
  ])

  React.useEffect(() => {
    if (webviewEditor == null) return

    webviewEditor.layout(
      new Dimension((width - 2) * scale, (height - HEADER_HEIGHT - 2) * scale),
    )
  }, [webviewEditor, width, height, boundingBox, scale, editorPosition])

  return (
    boundingBox != null && (
      <div
        className={classNames({
          editorDummyContainer: true,
          selected: isSelected,
        })}
        style={{
          transform: `scale(${isPinned ? 1.0 : scale})`,
          left: `${editorPosition.x + (boundingBox?.x ?? 0)}px`,
          top: `${editorPosition.y + (boundingBox?.y ?? 0)}px`,
          width: `${isPinned ? vWidth : width}px`,
          height: `${isPinned ? vHeight : height}px`,
          zIndex: isPinned ? 100 : isSelected ? 99 : zIndex,
        }}
      >
        <CodeEditorContainerImpl editorId={editorId} />
      </div>
    )
  )
}

export const CodeEditorContainerImpl = React.memo(
  function CodeEditorContainerImpl({ editorId }: CodeEditorContainerProps) {
    const scale = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.canvasScale,
    )
    const rootDirNameLen = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.getWorkspacePath()?.length,
    )
    const selection = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.selection,
    )
    const editor = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.idToEditorMap.get(editorId) as CanvasCodeEditor,
    )
    const [isHoldingModifier, isHoldingOptAlt] =
      WorkspaceStoreWrapper.useWorkspaceState((state) => [
        state.isHoldingModifier,
        state.isHoldingOptAlt,
      ])

    const queryClient = useQueryClient()

    const [containerElement, setContainerElement] =
      React.useState<HTMLDivElement | null>(null)

    const {
      filePath,
      uri,
      symbolName,
      symbolType,
      isGhost,
      isDirty,
      options,
      editRange,
      identifier,
      dependencyListType,
      isPinned,
    } = editor

    const isSelected = React.useMemo(() => selection.has(editorId), [selection])

    const [
      updateEditorBounds,
      closeEditor,
      deleteEditorsInSelection,
      selectEditor,
      setDependencyListType,
    ] = WorkspaceStoreWrapper.useWorkspaceState((state) => [
      state.updateEditorBounds,
      state.closeEditor,
      state.deleteEditorsInSelection,
      state.selectEditor,
      state.setDependencyListType,
    ])

    const relativeFilePath =
      rootDirNameLen == null ? filePath : filePath.substring(rootDirNameLen)

    const containerRef = React.useCallback(
      (containerElement: HTMLDivElement) => {
        WorkspaceStoreWrapper.getWorkspaceState().setEditorContainer(
          editorId,
          containerElement,
        )
        setContainerElement(containerElement)
      },
      [],
    )

    const resizeOptions: ResizableOptions = React.useMemo(() => {
      return {
        edges: { left: true, right: true, bottom: true, top: true },
        margin: 5,
        eventHandler: (event) => {
          const { positionDelta, sizeDelta } = event
          WorkspaceStoreWrapper.getWorkspaceState().updateEditorBounds(
            editorId,
            positionDelta,
            sizeDelta,
          )
        },
        restriction: {
          min: {
            width: 50,
            height: 50,
          },
        },
        onStart: (e) => {
          selectEditor(
            editorId,
            /* clearSelection */ !e.shiftKey && !isSelected,
          )
          containerElement?.focus()
        },
        onEnd: commitAction,
        onClick: (e) => {
          selectEditor(editorId, /* clearSelection */ !e.shiftKey)
          containerElement?.focus()
          commitAction()
        },
        doNotConsiderScale: isPinned,
      }
    }, [isSelected, containerElement, isPinned])

    useResizable(containerElement, resizeOptions)

    const handleBoundsKeyDown = useHandleBoundsKeyDown(editorId)

    const saveEditor = React.useCallback(() => {
      if (identifier == null) return
      WorkspaceStoreWrapper.getWorkspaceState().saveEditor(identifier)
    }, [identifier])

    const onKeyDown = useEditorOnKeyDown(
      editorId,
      containerElement,
      handleBoundsKeyDown,
      deleteEditorsInSelection,
      saveEditor,
    )

    const [model, setModel] = React.useState<ITextModel | null>(null)

    const onKeyDownCapture = useEditorOnKeyDownCapture(
      deleteEditorsInSelection,
      saveEditor,
    )

    const onWheelCapture = useScrollHandler()

    // These need to be use callbacks to prevent unnecessary re-renders.
    const onMoveClick = React.useCallback(
      (e: MouseEvent) => {
        selectEditor(editorId, /* clearSelection */ !e.shiftKey)
        containerElement?.focus()
        commitAction()
      },
      [containerElement],
    )
    const onMoveStart = React.useCallback(
      (e: MouseEvent) => {
        selectEditor(editorId, /* clearSelection */ !e.shiftKey && !isSelected)
        containerElement?.focus()
      },
      [isSelected, containerElement],
    )

    const fileName = React.useMemo(() => {
      if (uri.scheme === "walkThrough") return "Welcome"
      const dirs = filePath.split("/")
      if (dirs.length === 0) return ""
      return dirs[dirs.length - 1]
    }, [filePath])

    const [localSelectionRange, setLocalSelectionRange] =
      React.useState<IRange | null>(null)
    const symbolRef = React.useRef<DocumentSymbol | null>(null)
    const callProviderRef = React.useRef<CallHierarchyProvider | null>()
    const editRangeRef = React.useRef<IRange | null>(null)
    const selectionRangeRef = React.useRef<IRange | null>(null)
    const symbolTypeRef = React.useRef<SymbolKind | null>(null)

    const extension = React.useMemo(() => {
      return filePath.split(".").pop()
    }, [filePath])

    // Some language servers deal very poorly with outgoing dependencies.
    const shouldCalculateOutgoingDeps = React.useMemo(() => {
      switch (extension) {
        case "rs":
        case "cpp":
        case "c":
        case "h":
        case "hpp":
        case "cc":
        case "hh":
          return false
        default:
          return true
      }
    }, [extension])

    React.useEffect(() => {
      function cleanUpAndExit() {
        callProviderRef.current = null
        queryClient.invalidateQueries([`${editorId}-${INCOMING_DEPS_KEY}`])
        queryClient.invalidateQueries([`${editorId}-${OUTGOING_DEPS_KEY}`])
      }

      async function setCallProvider() {
        editRangeRef.current = editRange
        symbolTypeRef.current = symbolType

        if (editRange == null && localSelectionRange == null) {
          cleanUpAndExit()
          return
        }

        // We're waiting for the model to be set before we can create the call provider.
        if (model == null) {
          cleanUpAndExit()
          return
        }

        const haystackService =
          WorkspaceStoreWrapper.getWorkspaceState().haystackService
        if (haystackService == null) {
          cleanUpAndExit()
          return
        }

        const checkedRange =
          editRange && symbolType && isCallableSymbol(symbolType)
            ? editRange
            : localSelectionRange

        if (checkedRange == null) {
          cleanUpAndExit()
          return
        }

        const adjustedRange = adjustRangeForComments(checkedRange, model)

        const currentSymbol = await haystackService.getCallableSymbolAtRange(
          model,
          adjustedRange,
        )

        const oldSymbol = symbolRef.current
        symbolRef.current = currentSymbol

        if (
          currentSymbol &&
          oldSymbol &&
          Range.equalsRange(oldSymbol.range, currentSymbol.range)
        ) {
          return
        }

        if (
          symbolRef.current == null ||
          !isCallableSymbol(symbolRef.current.kind)
        ) {
          cleanUpAndExit()
          return
        }

        let position = new Position(
          symbolRef.current.selectionRange.startLineNumber,
          symbolRef.current.selectionRange.startColumn,
        )
        let wordAtPosition = model.getWordAtPosition(position)

        while (
          wordAtPosition?.word === " " ||
          wordAtPosition?.word === "async" ||
          wordAtPosition?.word === "public" ||
          wordAtPosition?.word === "private" ||
          wordAtPosition?.word === "protected"
        ) {
          position = new Position(
            position.lineNumber,
            wordAtPosition.endColumn + 1,
          )
          wordAtPosition = model.getWordAtPosition(position)
        }

        callProviderRef.current = new CallHierarchyProvider(model, position)

        queryClient.invalidateQueries([`${editorId}-${INCOMING_DEPS_KEY}`])
        queryClient.invalidateQueries([`${editorId}-${OUTGOING_DEPS_KEY}`])
      }

      const haystackService =
        WorkspaceStoreWrapper.getWorkspaceState().haystackService
      if (
        haystackService != null &&
        haystackService.getEnableSymbolAtFileSelection() &&
        editRange == null &&
        localSelectionRange != null
      ) {
        haystackService
          .getDeepestSymbolWithPredicate(
            editor.uri,
            localSelectionRange,
            (symbol) => isNotableSymbol(symbol.kind),
          )
          .then((symbol) => {
            WorkspaceStoreWrapper.getWorkspaceState().setCurrentSymbol(
              editorId,
              symbol,
            )
          })
      } else {
        WorkspaceStoreWrapper.getWorkspaceState().setCurrentSymbol(
          editorId,
          null,
        )
      }

      setCallProvider()
    }, [model, editRange, localSelectionRange, symbolType])

    const { isLoading: incomingDepsLoading, data: incomingDepsData } = useQuery(
      {
        queryKey: [`${editorId}-${INCOMING_DEPS_KEY}`],
        queryFn: async () => {
          const haystackService =
            WorkspaceStoreWrapper.getWorkspaceState().haystackService

          if (callProviderRef.current != null && haystackService != null) {
            const calls = await callProviderRef.current.getIncomingCalls()
            if (calls == null) return null
            return haystackService.convertIncomingCallsToDeps(calls)
          } else {
            return null
            // Don't calculate incoming deps for non-callable symbols.
            // if (model == null) {
            //   return null
            // }
            // if (symbolRef.current == null) {
            //   return haystackService.getIncomingDeps(
            //     editRangeRef.current ?? selectionRangeRef.current!,
            //     filePath
            //   )
            // } else {
            //   return haystackService.getIncomingDeps(
            //     symbolRef.current.selectionRange,
            //     filePath
            //   )
            // }
          }
        },
        structuralSharing: false,
        enabled: !!model,
      },
    )

    const { isLoading: outgoingDepsLoading, data: outgoingDepsData } = useQuery(
      {
        queryKey: [`${editorId}-${OUTGOING_DEPS_KEY}`],
        queryFn: async () => {
          const haystackService =
            WorkspaceStoreWrapper.getWorkspaceState().haystackService

          if (
            callProviderRef.current != null &&
            haystackService != null &&
            shouldCalculateOutgoingDeps
          ) {
            const calls = await callProviderRef.current.getOutgoingCalls()
            if (calls == null) return null
            return haystackService.convertOutgoingCallsToDeps(calls)
          } else {
            // Don't calculate outgoing dependencies for non-callable symbols.
            return null
            // if (model == null) return null

            // return haystackService.getOutgoingDeps(editRange, filePath)
          }
        },
        structuralSharing: false,
        enabled: !!model,
      },
    )

    const onSelectionChange = React.useCallback(
      (selectionRange: IRange | null) => {
        const oldSelection = selectionRangeRef.current
        selectionRangeRef.current = selectionRange

        // Note that we can't use local selection range due to this being captured in
        // a closure.
        if ((selectionRangeRef.current == null) !== (oldSelection == null)) {
          setLocalSelectionRange(selectionRange)
        } else if (
          selectionRangeRef.current &&
          oldSelection &&
          selectionRangeRef.current.startLineNumber !==
            oldSelection.startLineNumber
        ) {
          setLocalSelectionRange(selectionRange)
        }

        WorkspaceStoreWrapper.getWorkspaceState().setSelectionRange(
          editorId,
          selectionRange,
        )
      },
      [],
    )

    const editorSize = React.useMemo(() => getSizeForEditor(editor), [editor])

    const dependencyListRelativePosition = React.useMemo(
      () =>
        new Vector(
          editorSize.x + 60,
          editorSize.y / 2 +
            (dependencyListType === SymbolDepsType.INCOMING ? -30 : 5),
        ),
      [editorSize, dependencyListType],
    )

    const editorContainerRef = React.useRef<HTMLDivElement | null>(null)

    const thisEditorIsFocused = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.focusedEditorId === editorId,
    )

    const shouldDisplayViewportNumber = React.useMemo(() => {
      return !thisEditorIsFocused && isHoldingModifier
    }, [isHoldingModifier, thisEditorIsFocused])

    const moveOptions: MoveOptions = React.useMemo(() => {
      return {
        eventHandler: (positionDelta: Vector) => {
          updateEditorBounds(editorId, positionDelta, Vector.new())
        },
        onStart: onMoveStart,
        onEnd: commitAction,
        onClick: onMoveClick,
      }
    }, [onMoveStart, commitAction, onMoveClick])

    useMoveable(
      containerElement,
      moveOptions,
      /* useMoveBehaviorCondition */ scale <= 0.5 ||
        (isHoldingModifier && isHoldingOptAlt),
    )

    return (
      <div
        className={classNames({
          fileEditorContainer: true,
          selected: isSelected,
          ghost: isGhost,
          pinned: isPinned,
        })}
        ref={containerRef}
        onKeyDown={(e) => {
          if (e.target !== containerElement) {
            return
          }
          onKeyDown(e)
        }}
        onKeyDownCapture={onKeyDownCapture}
        onWheelCapture={onWheelCapture}
        onBlurCapture={(e) => {
          if (
            (!containerElement?.contains(e.relatedTarget) ?? false) &&
            !WorkspaceStoreWrapper.getWorkspaceState().floatingToolbarElement?.contains(
              e.relatedTarget,
            )
          ) {
            if (
              WorkspaceStoreWrapper.getWorkspaceState().focusedEditorId ===
                editorId &&
              e.relatedTarget === canvasRef.current
            ) {
              WorkspaceStoreWrapper.getWorkspaceState().setFocusedEditor(null)
            }
          }

          if (
            !containerElement?.contains(e.relatedTarget) ||
            editorContainerRef.current?.contains(e.relatedTarget)
          ) {
            setDependencyListType(editorId, null)
          }
        }}
        onPointerDownCapture={(e) => {
          const editorContainsTarget = !!editorContainerRef.current?.contains(
            e.target as HTMLElement,
          )
          selectEditor(
            editorId,
            /* clearSelection */ editorContainsTarget ||
              (!isSelected && !e.shiftKey),
          )
        }}
        onFocusCapture={(e) => {
          WorkspaceStoreWrapper.getWorkspaceState().setFocusedEditor(editorId)
          const editorContainsTarget = !!editorContainerRef.current?.contains(
            e.target,
          )
          if (editorContainsTarget) {
            // We pan to the editor if the user clicked inside the editor.
            WorkspaceStoreWrapper.getWorkspaceState().panToFocusedEditor(
              editorId,
            )
            setDependencyListType(editorId, null)
          }
          selectEditor(editorId, /* clearSelection */ editorContainsTarget)
        }}
        tabIndex={0}
      >
        <EditorHeader
          fileName={symbolName ?? fileName ?? ""}
          relativeFilePath={relativeFilePath}
          symbolType={symbolType ?? undefined}
          icon={
            symbolType ? (
              getSymbolIcon(symbolType, { width: 15, height: 15 })
            ) : (
              <SmallFileSvg width={15} height={15} />
            )
          }
          onClose={() => closeEditor(editorId)}
          onMove={(delta: Vector) => {
            updateEditorBounds(editorId, delta, new Vector(0, 0))
          }}
          isDirty={isDirty}
          onMoveStart={onMoveStart}
          onMoveEnd={commitAction}
          onMoveClick={onMoveClick}
          editorId={editorId}
        />
        <CodeEditor
          uri={uri}
          editRange={editRange}
          editorContainerRef={editorContainerRef}
          editorId={editorId}
          setModel={setModel}
          options={options}
          onSelectionChange={onSelectionChange}
        />
        {isSelected && !incomingDepsLoading && incomingDepsData?.length ? (
          <SymbolDepsButton
            depsType={SymbolDepsType.INCOMING}
            xPosition={editorSize.x + 20}
            yPosition={editorSize.y / 2 - 30}
            onSelect={() => {
              if (dependencyListType === SymbolDepsType.INCOMING) {
                setDependencyListType(editorId, null)
              } else {
                setDependencyListType(editorId, SymbolDepsType.INCOMING)
              }
            }}
            isActive={dependencyListType === SymbolDepsType.INCOMING}
          />
        ) : null}
        {isSelected && !outgoingDepsLoading && outgoingDepsData?.length ? (
          <SymbolDepsButton
            depsType={SymbolDepsType.OUTGOING}
            xPosition={editorSize.x + 20}
            yPosition={editorSize.y / 2 + 5}
            onSelect={() => {
              if (dependencyListType === SymbolDepsType.OUTGOING) {
                setDependencyListType(editorId, null)
              } else {
                setDependencyListType(editorId, SymbolDepsType.OUTGOING)
              }
            }}
            isActive={dependencyListType === SymbolDepsType.OUTGOING}
          />
        ) : null}
        {dependencyListType != null &&
          (dependencyListType === SymbolDepsType.OUTGOING
            ? (outgoingDepsData?.length ?? 0) > 0
            : (incomingDepsData?.length ?? 0) > 0) &&
          isSelected && (
            <SymbolDependencyList
              editor={editor}
              absolutePosition={Vector.add(
                new Vector(editor.xPosition, editor.yPosition),
                dependencyListRelativePosition,
              )}
              relativePosition={dependencyListRelativePosition}
              symbolDeps={
                dependencyListType === SymbolDepsType.OUTGOING
                  ? (outgoingDepsData ?? [])
                  : (incomingDepsData ?? [])
              }
              closeList={() => {
                setDependencyListType(editorId, null)
                WorkspaceStoreWrapper.getWorkspaceState().focusOnEditor(
                  editorId,
                )
              }}
              symbolDepsListType={dependencyListType}
            />
          )}
        {shouldDisplayViewportNumber && (
          <ViewportNumberDisplay editorId={editorId} />
        )}
      </div>
    )
  },
)
