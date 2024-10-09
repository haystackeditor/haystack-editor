/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from "vs/base/common/uri"
import { Rectangle } from "vs/workbench/browser/haystack-frontend/canvas/rectangle"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { IRange } from "vs/editor/common/core/range"
import {
  IIdentifiedSingleEditOperation,
  ITextModel,
} from "vs/editor/common/model"
import { IMarkerData } from "vs/platform/markers/common/markers"
import { StoreApi } from "zustand/vanilla"

import type { HaystackService } from "vs/workbench/services/haystack/browser/haystackService"
import {
  IEditorOptions,
  IResourceEditorInput,
} from "vs/platform/editor/common/editor"
import {
  IEditorIdentifier,
  IEditorPane,
  IResourceMergeEditorInput,
} from "vs/workbench/common/editor"
import { IDisposable } from "node-pty"
import { DocumentSymbol, SymbolKind } from "vs/editor/common/languages"
import {
  EditorOpenArgs,
  ExistingEditorArgs,
} from "vs/workbench/services/haystack/common/haystackService"
import { EditorInput } from "vs/workbench/common/editor/editorInput"
import { useZustand } from "vs/workbench/browser/haystack-frontend/react_utils/use_zustand"
import { DeferredPromise } from "vs/base/common/async"
import { ReferencesModel } from "vs/editor/contrib/gotoSymbol/browser/referencesModel"
import { ICodeEditor } from "vs/editor/browser/editorBrowser"
import { CanvasWorkspace } from "vs/workbench/services/haystack/browser/canvasWorkspaceCommon"
import {
  NavigationType,
  OpenAiSettings,
  SymbolDepsType,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import { ConfirmResult } from "vs/platform/dialogs/common/dialogs"
import { IReference } from "vs/base/common/lifecycle"
import { ITextFileEditorModel } from "vs/workbench/services/textfile/common/textfiles"
import { TextDiffEditor } from "vs/workbench/browser/parts/editor/textDiffEditor"
import {
  KeyCodeChord,
  ResolvedKeybinding,
  ScanCodeChord,
} from "vs/base/common/keybindings"
import { HaystackReferenceWidget } from "vs/editor/contrib/gotoSymbol/browser/peek/haystackReferencesWidget"
import { NotebookEditor } from "vs/workbench/contrib/notebook/browser/notebookEditor"
import { HaystackTelemetryService } from "vs/workbench/services/haystackTelemetry/browser/haystackTelemetryService"
import {
  CanvasCodeEditor,
  CanvasDiffEditor,
  CanvasEditor,
  CanvasEditorType,
  CanvasGhostEditor,
} from "vs/workbench/browser/haystack-frontend/editor/editor"
import { WebviewEditor } from "vs/workbench/contrib/webviewPanel/browser/webviewEditor"

export class WorkspaceStoreWrapper {
  static workspaceStore: StoreApi<WorkspaceState>
  static workspaceStoreIsInitialized: DeferredPromise<void> =
    new DeferredPromise()

  static setWorkspaceStore(workspaceStore: StoreApi<WorkspaceState>) {
    this.workspaceStore = workspaceStore
    this.workspaceStoreIsInitialized.complete()
  }

  static getWorkspaceState(): WorkspaceState {
    return this.workspaceStore.getState()
  }

  static setWorkspaceState(state: Partial<WorkspaceState>) {
    this.workspaceStore.setState(state)
  }

  static useWorkspaceState<T>(selector: (state: WorkspaceState) => T): T {
    return useZustand(this.workspaceStore, selector)
  }
}

export const LINE_HEIGHT = 18
export const LINE_SPACING = 16

export const enum SourceCodeDataType {
  FILE = 0,
  SYMBOL = 1,
}

export type BaseSourceCodeData = {
  dataType: SourceCodeDataType
  sourceCodeByLine: string[]
  selectionRange: IRange
}

export type FileSourceCodeData = BaseSourceCodeData & {
  dataType: SourceCodeDataType.FILE
  fileName: string
  filePath: string
  uri: URI
}

export type SymbolSourceCodeData = BaseSourceCodeData & {
  dataType: SourceCodeDataType.SYMBOL
  symbolName: string
}

export type BaseRangeData = {
  dataType: SourceCodeDataType
  selectionRange: IRange | null
  filePath: string
  editorId: string
}

export type FileRangeData = BaseRangeData & {
  dataType: SourceCodeDataType.FILE
}

export type SymbolRangeData = BaseRangeData & {
  dataType: SourceCodeDataType.SYMBOL
  range: IRange
}

export type SourceCodeByLineData = FileSourceCodeData | SymbolSourceCodeData

export type RangeData = FileRangeData | SymbolRangeData

export interface QuickEditData {
  overwrittenSourceCode: string
  selectionRanges: IRange[]
}

export interface EditedRange {
  range: IRange
  text: string
  timestamp: number
}

export interface DiagnosticRowOffset {
  id: string
  rowOffset: number
  rowDelta: number
}

export interface ChangeQueueItem {
  id: string
  changes: IIdentifiedSingleEditOperation[]
  shouldIgnoreDiagnostics: boolean
}

type State = {
  canvasCamera: Vector
  canvasScale: number
  idToEditorMap: Map<string, CanvasEditor>
  sourceToGhosteditorIdMultiMap: Map<string, string>
  modelIdtoEditorIdMap: Map<string, string>
  filePathToEditedRange: Map<string, EditedRange[]>
  editorIdToOriginalEditor: Map<string, CanvasEditor>
  selection: Set<string>
  // Hacky way to focus on a editor during specific events.
  editorToFocus: string
  symbolIdToModelMap: Map<number, ITextModel>
  filePathToModelMap: Map<string, ITextModel>
  fileIdChangeQueue: ChangeQueueItem[]
  symbolIdChangeQueue: ChangeQueueItem[]
  filePathToDiagnostics: Map<string, IMarkerData[]>
  filePathToDiagnosticRowOffset: Map<string, DiagnosticRowOffset[]>
  isMakingBypassingEdits: boolean
  haystackService: HaystackService | null
  haystackTelemetryService: HaystackTelemetryService | null
  openEditors: Set<IEditorIdentifier>
  maxZIndex: number
  haystackServiceIsInitialized: DeferredPromise<void>
  haystackTelemetryServiceIsInitialized: DeferredPromise<void>
  ghostEditorSets: Set<string>[]
  sortedEditors: CanvasEditor[]
  isHoldingModifier: boolean
  isHoldingOptAlt: boolean
  focusedEditorId: string | null
  canvasWorkspaces: CanvasWorkspace[]
  currentCanvasWorkspace: CanvasWorkspace | null
  canvasWorkspaceIsDirty: boolean
  openAiSettings: OpenAiSettings
  floatingToolbarElement: HTMLElement | null
  previousEditorHistoryStack: (string | null)[]
  nextEditorHistoryStack: (string | null)[]
  previousEditorSelectionHistoryMap: Map<string, IRange[]>
  nextEditorSelectionHistoryMap: Map<string, IRange[]>
  showNavigationBar: boolean
}

type Actions = {
  getEditorPosition: (
    editorId: string,
    idToEditorMap?: Map<string, CanvasEditor>,
  ) => Vector
  addModel: (modelId: string, editorId: string) => void
  removeModel: (modelId: string) => void
  getEditorFromModelId: (modelId: string) => CanvasEditor | null
  insertFileEditorAtCenterOfViewport: (
    filePath: string,
    uri: URI,
    editorPanePromise: DeferredPromise<IEditorPane | undefined>,
    args?: EditorOpenArgs,
    options?: IEditorOptions,
  ) => Promise<string>
  insertSymbolEditorAtCenterOfViewport: (
    symbolName: string,
    symbolType: SymbolKind,
    range: IRange,
    filePath: string,
    uri: URI,
    editorPanePromise: DeferredPromise<IEditorPane | undefined>,
    args?: EditorOpenArgs,
    options?: IEditorOptions,
  ) => Promise<string>
  insertFileDiffEditorAtCenterOfViewport: (
    filePath: string,
    originalUri: URI,
    modifiedUri: URI,
    editorPanePromise: DeferredPromise<IEditorPane | undefined>,
    args?: EditorOpenArgs,
    options?: IEditorOptions,
  ) => Promise<string>
  insertGhostEditorAtCenterOfViewport: (
    symbolName: string,
    symbolType: SymbolKind,
    range: IRange,
    filePath: string,
    uri: URI,
    value: string,
    args?: EditorOpenArgs,
    options?: IEditorOptions,
  ) => Promise<string>
  insertModalEditorAtCenterOfViewport: (
    editorInput: EditorInput | IResourceEditorInput,
    args?: EditorOpenArgs,
    options?: IEditorOptions,
    deferredEditorPanePromise?: DeferredPromise<IEditorPane | undefined>,
  ) => Promise<string>
  insertMergeEditorAtCenterOfViewport: (
    editorInput: IResourceMergeEditorInput,
    args?: EditorOpenArgs,
    options?: IEditorOptions,
    deferredEditorPanePromise?: DeferredPromise<IEditorPane | undefined>,
  ) => Promise<string>
  insertCopilotSettingsEditorAtCenterofViewport: () => string
  insertHaystackKeybindingsEditorAtCenterOfViewport: () => string
  removeEditor: (id: string) => void
  updateEditorSize: (id: string, numLines?: number, column?: number) => void
  updateEditorBounds: (id: string, posDelta: Vector, sizeDelta: Vector) => void
  updateUiPosition: (cameraDelta: Vector) => void
  setScale: (newScale: number, mousePosition: Vector) => void
  setFocusEditor: (editorId: string) => void
  selectEditor: (editorId: string, clearSelection: boolean) => void
  deselectEditor: (editorId: string) => void
  selectAllEditors: () => void
  clearSelection: () => void
  deleteEditorsInSelection: () => Promise<void>
  dragSelectEditors: (boundingRectangle: Rectangle, onlyAdd: boolean) => void
  closeEditor: (editorId: string, doNotPan?: boolean) => Promise<void>
  removeEditorForEditor: (editorId: string) => Promise<void>
  insertAdjacentEditor: (
    editorId: string,
    editorArgs: EditorArgs,
    selectAndFocusEditor: boolean,
    args?: EditorOpenArgs,
  ) => Promise<string>
  addDefinitionEditor: (
    fromEditor: CanvasEditor,
    editorArgs: EditorArgs,
  ) => Promise<string>
  // displaySearchEditor: (
  //   symbolName: string,
  //   symbolType: SymbolKind,
  //   range: IRange,
  //   filePath: string
  // ) => Promise<string>
  hideSearchEditor: (searcheditorId: string) => void
  saveEditor: (identifier: IEditorIdentifier) => Promise<void>
  saveReferenceEditor: (uri: URI) => Promise<void>
  onSaveEditor: (uri: URI) => void
  setEditorDirty: (editorId: string, isDirty: boolean) => void
  setEditorShowingCancellationModal: (
    editorId: string,
    showingCancellationModal: boolean,
  ) => void
  getPositionForNewEditor: (
    position: Vector,
    size: Vector,
    idToEditorMap: Map<string, CanvasEditor>,
  ) => Vector
  getViewportPositionForPinnedEditor: (
    position: Vector,
    size: Vector,
    idToEditorMap: Map<string, CanvasEditor>,
  ) => Vector
  addAdjacentFile: (
    fromEditor: CanvasEditor,
    filePath: string,
    uri: URI,
    selectAndFocusEditor: boolean,
    args?: EditorOpenArgs,
    options?: IEditorOptions,
  ) => Promise<string>
  addAdjacentSymbol: (
    fromEditor: CanvasEditor,
    symbolName: string,
    symbolType: SymbolKind,
    range: IRange,
    filePath: string,
    uri: URI,
    selectAndFocusEditor: boolean,
    args?: EditorOpenArgs,
    options?: IEditorOptions,
  ) => Promise<string>
  getViewportDimensionsWithPadding: () => Vector
  getEditorSelection: () => CanvasEditor[]
  editorGoUpOneLevel: (
    canvasEditor: CanvasCodeEditor | CanvasDiffEditor | CanvasGhostEditor,
  ) => Promise<void>
  editorGoDownOneLevel: (
    canvasEditor: CanvasCodeEditor | CanvasDiffEditor | CanvasGhostEditor,
  ) => Promise<void>
  editorGoToFile: (
    canvasEditor: CanvasCodeEditor | CanvasDiffEditor | CanvasGhostEditor,
  ) => Promise<void>
  editorGoToDeepestSymbol: (
    canvasEditor: CanvasCodeEditor | CanvasDiffEditor | CanvasGhostEditor,
  ) => Promise<void>
  setHaystackService: (haystackService: HaystackService) => void
  setHaystackTelemetryService: (
    haystackTelemetryService: HaystackTelemetryService,
  ) => void
  openCodeEditorForCanvasEditor: (
    editorId: string,
    domElement: HTMLElement,
    options?: IEditorOptions,
  ) => Promise<void>
  openFileDiffEditorForCanvasEditor: (
    editorId: string,
    domElement: HTMLElement,
    options?: IEditorOptions,
  ) => Promise<TextDiffEditor | null>
  openModalEditorForCanvasEditor: (
    editorId: string,
    editorInput: EditorInput | IResourceEditorInput,
    domElement: HTMLElement,
    options?: IEditorOptions,
  ) => Promise<void>
  openMergeEditorForCanvasEditor: (
    editorId: string,
    editorInput: IResourceMergeEditorInput,
    domElement: HTMLElement,
    options?: IEditorOptions,
  ) => Promise<void>
  closeFileEditor: (identifier: IEditorIdentifier) => Promise<boolean>
  getTextModel: (uri: URI) => ITextModel | null
  getOrCreateModel: (uri: URI) => Promise<ITextModel | null>
  getWorkspacePath: () => string | undefined
  addOnDidSaveListener: (listener: () => void) => IDisposable | null
  getNextZIndex: () => number
  manifestGhostEditor: (editorId: string) => void
  openGhostEditorForCanvasEditor: (
    editorId: string,
    originalUri: URI,
    scratchFilePath: string,
    domElement: HTMLDivElement,
    value: string,
    editRange: IRange | null,
  ) => Promise<void>
  dirtyModel: (editorId: string) => void
  getInitialEditorWidth: () => number
  sendTelemetry: (eventName: string, properties?: any) => Promise<void>
  panToEditorWithIdentifier: (editorIdentifier: IEditorIdentifier) => boolean
  setSelectionRange: (editorId: string, range: IRange | null) => void
  addGhostEditorSet: (ghosteditorIds: string[]) => void
  removeGhostEditorSet: (ghosteditorIds: string[]) => void
  addSelectionListener: (
    editorId: string,
    setSelectionRange: (range: IRange | null) => void,
  ) => IDisposable | null
  getSymbolStack: (canvasEditor: CanvasEditor) => Promise<DocumentSymbol[]>
  clearEditorRelationshipHighlights: (
    identifier: IEditorIdentifier | null,
    decorationId: string,
  ) => void
  setEditorRelationshipHighlights: (
    editorId: string,
    ranges: IRange[],
    color: number,
  ) => string[]
  setZoomLevel: (zoomLevel: number, lastMousePosition?: Vector) => void
  createReferencesEditor: (
    referencesModel: ReferencesModel,
    codeEditor: ICodeEditor,
    range: IRange,
  ) => void
  createReferencesEditorElement: (
    domElement: HTMLElement,
    referencesModel: ReferencesModel,
    codeEditor: ICodeEditor,
    range: IRange,
    editorId: string,
  ) => HaystackReferenceWidget | null
  setCurrentReference: (
    editorId: string,
    referenceUri: URI,
    numberOfReferences: number | null,
  ) => void
  setSortedEditors: (sortedEditors: CanvasEditor[]) => void
  isDarkMode: () => boolean
  navigateToEditor: (
    editor: CanvasEditor,
    navigationType: NavigationType,
  ) => void
  setIsHoldingModifier: (isHoldingModifier: boolean) => void
  setIsHoldingOptAlt: (isHoldingOptAlt: boolean) => void
  getFocusedEditor: () => CanvasEditor | null
  setFocusedEditor: (editorId: string | null) => void
  panToFocusedEditor: (editorId: string) => void
  getTransformInfoForEditor: (editorInput: EditorInput) => {
    xPosition: number
    yPosition: number
    width: number
    height: number
  } | null
  isGhostEditor: (editorInput: EditorInput) => boolean
  isModelIndexed: (model: ITextModel) => Promise<boolean>
  isShowingContextMenu: () => boolean
  openUrl: (url: string, trusted?: boolean) => void
  setCanvasWorkspaces: (canvasWorkspaces: CanvasWorkspace[]) => void
  openCanvasWorkspace: (uniqueId: string) => Promise<void>
  saveCurrentCanvasWorkspace: (
    workspaceName: string,
    canvasCamera: Vector,
    canvasScale: number,
  ) => void
  deleteCanvasWorkspace: (uniqueId: string) => Promise<void>
  loadCanvasWorkspaces: () => void
  setCamera: (cameraPosition: Vector) => void
  getParentContainerForElement: (element: HTMLElement) => HTMLElement | null
  respondToEditorClosing: (editorIdentifier: IEditorIdentifier) => void
  respondToCodeEditorClosing: (codeEditor: ICodeEditor) => void
  closeReferencesEditor: (
    editorId: string,
    codeEditor: ICodeEditor,
  ) => Promise<void>
  closeAllEditors: () => Promise<void>
  rearrangeAllEditors: () => Promise<void>
  setCanvasWorkspaceDirty: (isDirty: boolean) => void
  overwriteCurrentCanvasWorkspace: () => void
  setCurrentCanvasWorkspace: (canvasWorkspace: CanvasWorkspace) => void
  showConfirmationDialog: (
    message: string,
    detail: string,
    yesLabel: string,
    noLabel: string,
  ) => Promise<ConfirmResult>
  setShouldRespondToCloseEvents: (
    editorId: string,
    shouldRespondToEditorClosing: boolean,
  ) => void
  getHideCanvasDots: () => Promise<boolean>
  refreshEditRange: (editorId: string) => Promise<void>
  getTextModelRef: (
    uri: URI,
  ) => Promise<IReference<ITextFileEditorModel> | null>
  setOpenAiSettings: (openAiSettings: OpenAiSettings) => void
  setFloatingToolbarElement: (element: HTMLElement | null) => void
  focusOnEditorContainer: () => void
  focusOnCanvas: () => void
  setEditorContainer: (editorId: string, editorContainer: HTMLElement) => void
  focusOnEditor: (editorId: string) => void
  pushToEditorHistoryStack: (editorId: string | null) => void
  pushToEditorSelectionHistory: (editorId: string, selection: IRange) => void
  goToPreviousEditorInHistoryStack: () => void
  goToNextEditorInHistoryStack: () => void
  goToPreviousEditorSelection: (editorId: string) => void
  goToNextEditorSelection: (editorId: string) => void
  cleanHistoryStacks: (idToEditorMap: Map<string, CanvasEditor>) => void
  getKeybindingForCommand: (commandId: string) => ResolvedKeybinding | undefined
  getKeybindingForShortcut: (
    scanCodeChords: ScanCodeChord[],
    keyChords: KeyCodeChord[],
  ) => ResolvedKeybinding | undefined
  setDependencyListType: (
    editorId: string,
    dependencyListType: SymbolDepsType | null,
  ) => void
  pinCurrentEditor: () => void
  unpinCurrentEditor: () => void
  getPinnedBoundingBoxes: () => Rectangle[]
  setCurrentSymbol: (
    editorId: string,
    documentSymbol: DocumentSymbol | null,
  ) => void
  canMiddleClickToCloseEditors: () => boolean
  focusOnEditorWithWebview: (origin: string) => void
  blurEditorWithWebview: (origin: string) => void
  focusOnNotebookEditor: (notebookEditor: NotebookEditor) => void
  blurNotebookEditor: (notebookEditor: NotebookEditor) => void
  replaceEditorWithIdentifier: (
    editorIdentifier: IEditorIdentifier,
    uri: URI,
  ) => boolean
  setShowNavigationBar: (showNavigationBar: boolean) => void
  setWebviewEditor: (uuid: string, webviewEditor: WebviewEditor) => void
}

export type WorkspaceState = State & Actions

export function isSymbolEditorType(editorArgs: EditorArgs) {
  return (
    editorArgs.type === CanvasEditorType.CODE_EDITOR && editorArgs.range != null
  )
}

export function isEditorType(type: CanvasEditorType) {
  return (
    type === CanvasEditorType.CODE_EDITOR ||
    type === CanvasEditorType.DIFF_EDITOR ||
    type === CanvasEditorType.GHOST_EDITOR
  )
}

interface BasicEditorArgs {
  xPosition: number
  yPosition: number
  uuid: string
  width?: number
  height?: number
  positionByCenter?: boolean
}

export type EditorBaseArgs = {
  editorPanePromise?: DeferredPromise<IEditorPane | undefined>
  selectionRange?: IRange
  scrollPosition?: number
  highlightRange?: IRange
  options?: IEditorOptions
  existingEditorInput?: ExistingEditorArgs
}

export type BasicSymbolEditorArgs = {
  filePath: string
  uri: URI
  symbolType?: SymbolKind
  symbolName?: string
  range?: IRange
}

export type DiffEditorBaseArgs = {
  originalUri: URI
  modifiedUri: URI
}

export type DiffEditorArgs = EditorBaseArgs &
  DiffEditorBaseArgs & {
    type: CanvasEditorType.DIFF_EDITOR
    filePath: string
  }

export type CodeEditorArgs = BasicSymbolEditorArgs &
  EditorBaseArgs & {
    type: CanvasEditorType.CODE_EDITOR
  }

export type GhostFunctionEditorArgs = EditorBaseArgs &
  BasicSymbolEditorArgs & {
    type: CanvasEditorType.GHOST_EDITOR
    value: string
    isGhost: boolean
  }

export type ModalEditorArgs = EditorBaseArgs & {
  type: CanvasEditorType.MODAL_EDITOR
  editorInput: EditorInput | IResourceEditorInput
}

export type MergeEditorArgs = EditorBaseArgs & {
  type: CanvasEditorType.MERGE_EDITOR
  editorInput: IResourceMergeEditorInput
  deferredEditorPanePromise?: DeferredPromise<IEditorPane | undefined>
}

export type ReferencesEditorArgs = {
  type: CanvasEditorType.REFERENCES_EDITOR
  referencesModel: ReferencesModel
  codeEditor: ICodeEditor
  range: IRange
}

export type CopilotSettingsEditorArgs = {
  type: CanvasEditorType.COPILOT_SETTINGS_EDITOR
  zIndex: number
}

export type HaystackKeybindingsSettingsEditorArgs = {
  type: CanvasEditorType.HAYSTACK_KEYBINDINGS_EDITOR
  zIndex: number
}

export type EditorArgs =
  | CodeEditorArgs
  | DiffEditorArgs
  | GhostFunctionEditorArgs
  | ModalEditorArgs
  | ReferencesEditorArgs
  | CopilotSettingsEditorArgs
  | HaystackKeybindingsSettingsEditorArgs
  | MergeEditorArgs

export type FinalEditorArgs = BasicEditorArgs & EditorArgs

export function getSizeForEditorWithScale(
  editor: CanvasEditor,
  scale: number,
): Vector {
  return getSizeForEditor(editor).mul(scale)
}

export function getSizeForEditor(editor: CanvasEditor): Vector {
  return editor.isPinned
    ? new Vector(editor.vWidth, editor.vHeight)
    : new Vector(editor.width, editor.height)
}
