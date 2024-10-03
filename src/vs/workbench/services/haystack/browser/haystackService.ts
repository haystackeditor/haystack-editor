/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import {
  IResourceEditorInput,
  IEditorOptions,
} from "vs/platform/editor/common/editor"
import {
  IEditorPane,
  IEditorIdentifier,
  IEditorCloseEvent,
  IEditorWillOpenEvent,
  IUntypedEditorInput,
  IResourceMergeEditorInput,
} from "vs/workbench/common/editor"
import { editorBackground } from "vs/platform/theme/common/colorRegistry"
import { EditorInput } from "vs/workbench/common/editor/editorInput"
import { getLargeFileConfirmationLimit } from "vs/platform/files/common/files"
import { Event, Emitter } from "vs/base/common/event"
import { URI } from "vs/base/common/uri"
import {
  IEditorGroupsService,
  GroupDirection,
  ICloseEditorOptions,
} from "vs/workbench/services/editor/common/editorGroupsService"
import {
  DependencyArrowType,
  EditorOpenArgs,
  IHaystackService,
  LineMetadata,
  LocationMetadata,
  SortSymbolData,
  SymbolRelationship,
  SymbolResult,
  adjustRangeForComments,
} from "vs/workbench/services/haystack/common/haystackService"
import {
  IEditorsChangeEvent,
  ISaveEditorsResult,
  IEditorService,
} from "vs/workbench/services/editor/common/editorService"
import { IConfigurationService } from "vs/platform/configuration/common/configuration"
import {
  Disposable,
  IDisposable,
  DisposableStore,
  IReference,
  toDisposable,
} from "vs/base/common/lifecycle"
import {
  isDiffEditor,
  ICodeEditor,
  IDiffEditor,
  isCodeEditor,
  isMergeEditor,
} from "vs/editor/browser/editorBrowser"
import {
  InstantiationType,
  registerSingleton,
} from "vs/platform/instantiation/common/extensions"
import {
  DeferredPromise,
  createCancelablePromise,
  raceCancellation,
} from "vs/base/common/async"
import { IWorkspaceContextService } from "vs/platform/workspace/common/workspace"
import {
  ITextFileEditorModel,
  ITextFileService,
  TextFileResolveReason,
} from "vs/workbench/services/textfile/common/textfiles"
import { IModelService } from "vs/editor/common/services/model"
import { ITextModel } from "vs/editor/common/model"
import { IRange, Range } from "vs/editor/common/core/range"
import {
  Definition,
  DocumentSymbol,
  Location,
  LocationLink,
  ProviderResult,
  SymbolKind,
} from "vs/editor/common/languages"
import { ILanguageService } from "vs/editor/common/languages/language"
import { ILanguageFeaturesService } from "vs/editor/common/services/languageFeatures"
import { CancellationTokenSource } from "vs/base/common/cancellation"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { Position } from "vs/editor/common/core/position"
import {
  OpenAiSettings,
  SymbolDep,
  SymbolDepMetadata,
  SymbolDepsType,
  getMaxColumn,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import {
  IncomingCall,
  OutgoingCall,
} from "vs/workbench/contrib/callHierarchy/common/callHierarchy"
import { ITextModelService } from "vs/editor/common/services/resolverService"
import { isCallableSymbol } from "vs/workbench/browser/haystack-frontend/react_utils/is_function_symbol"
import {
  IOutlineModelService,
  OutlineElement,
  OutlineModelService,
  TreeElement,
} from "vs/editor/contrib/documentSymbols/browser/outlineModel"
import { IThemeService } from "vs/platform/theme/common/themeService"
import { RendererManager } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import { ReferencesModel } from "vs/editor/contrib/gotoSymbol/browser/referencesModel"
import { HaystackReferenceWidget } from "vs/editor/contrib/gotoSymbol/browser/peek/haystackReferencesWidget"
import { ReferencesController } from "vs/editor/contrib/gotoSymbol/browser/peek/referencesController"
import { ColorScheme } from "vs/platform/theme/common/theme"
import { ICodeEditorService } from "vs/editor/browser/services/codeEditorService"
import { IContextMenuService } from "vs/platform/contextview/browser/contextView"
import { EmailNotification } from "vs/workbench/services/haystack/browser/haystackRecommendationNotification"
import Severity from "vs/base/common/severity"
import {
  INotificationService,
  IPromptChoice,
  IPromptChoiceWithMenu,
} from "vs/platform/notification/common/notification"
import { localize } from "vs/nls"
import {
  IStorageService,
  StorageScope,
  StorageTarget,
} from "vs/platform/storage/common/storage"
import { IOpenerService } from "vs/platform/opener/common/opener"
import { generateUuid } from "vs/base/common/uuid"
import { EditorPart } from "vs/workbench/browser/parts/editor/editorPart"
import { CanvasWorkspace } from "vs/workbench/services/haystack/browser/canvasWorkspaceCommon"
import { Parts } from "vs/workbench/services/layout/browser/layoutService"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { ILayoutService } from "vs/platform/layout/browser/layoutService"
import { CodeWindow } from "vs/base/browser/window"
import {
  ConfirmResult,
  IDialogService,
} from "vs/platform/dialogs/common/dialogs"
import { ICommandService } from "vs/platform/commands/common/commands"
import {
  COPILOT_OPT_IN,
  IMPORT_VSCODE_SETTINGS_ID,
} from "vs/editor/contrib/haystack/haystackCommon"
import { TextDiffEditor } from "vs/workbench/browser/parts/editor/textDiffEditor"
import {
  IContextKeyService,
  RawContextKey,
} from "vs/platform/contextkey/common/contextkey"
import { IKeybindingService } from "vs/platform/keybinding/common/keybinding"
import {
  KeyCodeChord,
  Keybinding,
  ResolvedKeybinding,
  ScanCodeChord,
} from "vs/base/common/keybindings"
import { OS, OperatingSystem } from "vs/base/common/platform"
import { IKeyboardMapper } from "vs/platform/keyboardLayout/common/keyboardMapper"
import { IKeyboardLayoutService } from "vs/platform/keyboardLayout/common/keyboardLayout"
import { NotebookEditor } from "vs/workbench/contrib/notebook/browser/notebookEditor"
import { WebviewEditor } from "vs/workbench/contrib/webviewPanel/browser/webviewEditor"
import { EditorPane } from "vs/workbench/browser/parts/editor/editorPane"
import { IHaystackTelemetryService } from "vs/workbench/services/haystackTelemetry/common/haystackTelemetry"
import { middlewareManager } from "vs/workbench/browser/haystack-frontend/middleware/middleware"
import { MiddlewareType } from "vs/workbench/browser/haystack-frontend/middleware/middleware_common"
import { SpatialSortMiddleware } from "vs/workbench/browser/haystack-frontend/middleware/spatial_sort_middleware"
import {
  CanvasCodeEditor,
  CanvasEditorType,
  CanvasMergeEditor,
  CanvasModalEditor,
  CanvasReferencesEditor,
} from "vs/workbench/browser/haystack-frontend/editor/editor"
import { MergeEditor } from 'vs/workbench/contrib/mergeEditor/browser/view/mergeEditor'

interface IEditorConfiguration {
  editor: {
    haystackEditor: {
      initialWidth: number
      copilotOptOut: boolean
      hideCanvasDots: boolean
      middleMouseClickToCloseEditors: boolean
      enableSymbolAtFileSelection: boolean
    }
  }
}

const CANVAS_WORKSPACE_KEY = "haystack.canvas.workspace"
const CANVAS_SCALE_KEY = "haystack.canvas.scale"
const CURRENT_CANVAS_WORKSPACE_KEY = "haystack.canvas.currentCanvasWorkspace"
const CANVAS_CAMERA_KEY = "haystack.canvas.camera"
const OPEN_AI_SETTINGS_KEY = "haystack.openai.settings"

export class HaystackService extends Disposable implements IHaystackService {
  declare readonly _serviceBrand: undefined

  //#region events

  private readonly _onDidActiveEditorChange = this._register(
    new Emitter<void>(),
  )
  readonly onDidActiveEditorChange = this._onDidActiveEditorChange.event

  private readonly _onDidVisibleEditorsChange = this._register(
    new Emitter<void>(),
  )
  readonly onDidVisibleEditorsChange = this._onDidVisibleEditorsChange.event

  private readonly _onDidEditorsChange = this._register(
    new Emitter<IEditorsChangeEvent>(),
  )
  readonly onDidEditorsChange = this._onDidEditorsChange.event

  private readonly _onWillOpenEditor = this._register(
    new Emitter<IEditorWillOpenEvent>(),
  )
  readonly onWillOpenEditor = this._onWillOpenEditor.event

  private readonly _onDidCloseEditor = this._register(
    new Emitter<IEditorCloseEvent>(),
  )
  readonly onDidCloseEditor = this._onDidCloseEditor.event

  private readonly _onDidOpenEditorFail = this._register(
    new Emitter<IEditorIdentifier>(),
  )
  readonly onDidOpenEditorFail = this._onDidOpenEditorFail.event

  private readonly _onDidMostRecentlyActiveEditorsChange = this._register(
    new Emitter<void>(),
  )
  readonly onDidMostRecentlyActiveEditorsChange =
    this._onDidMostRecentlyActiveEditorsChange.event

  private contextMenuVisible = false
  private contextMenuHideTimer: NodeJS.Timeout | null = null

  //#endregion

  private readonly canNavigateNavigationsContextKey =
    new RawContextKey<boolean>(
      "canNavigateBack",
      false,
      localize(
        "canNavigateBackInNavigationLocations",
        "Whether it is possible to navigate back in editor navigation locations history",
      ),
    ).bindTo(this._contextKeyService)
  private readonly canNavigateForwardContextKey = new RawContextKey<boolean>(
    "canNavigateForward",
    false,
    localize(
      "canNavigateForwardInNavigationLocations",
      "Whether it is possible to navigate forward in editor navigation locations history",
    ),
  ).bindTo(this._contextKeyService)

  private _keyboardMapper: IKeyboardMapper

  constructor(
    @IEditorGroupsService
    private readonly editorGroupService: IEditorGroupsService,
    @IConfigurationService
    private readonly configurationService: IConfigurationService,
    @IWorkspaceContextService
    private readonly contextService: IWorkspaceContextService,
    @ITextFileService private readonly _textFileService: ITextFileService,
    @IEditorService private readonly _editorService: IEditorService,
    @IModelService private readonly _modelService: IModelService,
    @ILanguageService private readonly _languageService: ILanguageService,
    @ILanguageFeaturesService
    private readonly _languageFeaturesService: ILanguageFeaturesService,
    @ITextModelService
    private readonly _textModelService: ITextModelService,
    @IOutlineModelService
    private readonly _outlineModelService: OutlineModelService,
    @IThemeService private readonly _themeService: IThemeService,
    @ICodeEditorService private readonly _codeEditorService: ICodeEditorService,
    @IContextMenuService
    private readonly _contextMenuService: IContextMenuService,
    @INotificationService
    private readonly _notificationService: INotificationService,
    @IStorageService private readonly _storageService: IStorageService,
    @IOpenerService private readonly _openerService: IOpenerService,
    @ILayoutService private readonly _layoutService: ILayoutService,
    @IDialogService private readonly _dialogService: IDialogService,
    @ICommandService private readonly _commandService: ICommandService,
    @IContextKeyService private readonly _contextKeyService: IContextKeyService,
    @IKeybindingService
    private readonly _keybindingsService: IKeybindingService,
    @IKeyboardLayoutService keyboardLayoutService: IKeyboardLayoutService,
    @IHaystackTelemetryService
    haystackTelemetryService: IHaystackTelemetryService,
  ) {
    super()

    this._keyboardMapper = keyboardLayoutService.getKeyboardMapper()
    this._register(
      keyboardLayoutService.onDidChangeKeyboardLayout(() => {
        this._keyboardMapper = keyboardLayoutService.getKeyboardMapper()
      }),
    )

    this._contextMenuService.onDidShowContextMenu(() => {
      if (this.contextMenuHideTimer != null) {
        clearTimeout(this.contextMenuHideTimer)
      }
      this.contextMenuVisible = true
    })

    this._contextMenuService.onDidHideContextMenu(() => {
      if (this.contextMenuHideTimer != null) {
        clearTimeout(this.contextMenuHideTimer)
      }
      this.contextMenuHideTimer = setTimeout(() => {
        // Delays the visibility mutation because this races with the on context menu
        // event in canvas/workspace.
        this.contextMenuVisible = false
      }, 2000)
    })

    this._register(this._textFileService.onDidSave((e) => this.onSaveEditor(e)))

    WorkspaceStoreWrapper.workspaceStoreIsInitialized.p.then(() => {
      WorkspaceStoreWrapper.getWorkspaceState().setHaystackService(this)
    })

    this._themeService.onDidColorThemeChange((e) => {
      const colorString =
        e.getColor(editorBackground, true)?.toString() ?? "0xffffff"
      const hexColorString = colorString.replace("#", "0x")
      const hexColor = Number(hexColorString)
      RendererManager.getInstance().changeColor(hexColor)
    })

    // Stores the current camera position.
    this._register(
      this._storageService.onWillSaveState(() => {
        const canvasCameraPosition =
          WorkspaceStoreWrapper.getWorkspaceState().canvasCamera
        const canvasScale =
          WorkspaceStoreWrapper.getWorkspaceState().canvasScale
        const currentCanvasWorkspace =
          WorkspaceStoreWrapper.getWorkspaceState().currentCanvasWorkspace
        this._storageService.store(
          CANVAS_CAMERA_KEY,
          canvasCameraPosition,
          StorageScope.WORKSPACE,
          StorageTarget.MACHINE,
        )
        this._storageService.store(
          CANVAS_SCALE_KEY,
          canvasScale,
          StorageScope.WORKSPACE,
          StorageTarget.MACHINE,
        )
        this._storageService.store(
          CURRENT_CANVAS_WORKSPACE_KEY,
          currentCanvasWorkspace,
          StorageScope.WORKSPACE,
          StorageTarget.MACHINE,
        )
      }),
    )

    this.showCopilotOptInNotification()
    this.showVsCodeImportDialog()

    const persistedCameraJson = this._storageService.get(
      CANVAS_CAMERA_KEY,
      StorageScope.WORKSPACE,
    )
    if (persistedCameraJson != null) {
      const persistedCamera = JSON.parse(persistedCameraJson) as Vector
      WorkspaceStoreWrapper.workspaceStoreIsInitialized.p.then(() => {
        RendererManager.rendererManagerIsInitialized.p.then(() => {
          WorkspaceStoreWrapper.getWorkspaceState().setCamera(
            new Vector(persistedCamera.x, persistedCamera.y),
          )
        })
      })
    }

    const persistedScaleJson = this._storageService.get(
      CANVAS_SCALE_KEY,
      StorageScope.WORKSPACE,
    )
    if (persistedScaleJson != null) {
      const persistedScale = JSON.parse(persistedScaleJson) as number
      WorkspaceStoreWrapper.workspaceStoreIsInitialized.p.then(() => {
        RendererManager.rendererManagerIsInitialized.p.then(() => {
          WorkspaceStoreWrapper.getWorkspaceState().setZoomLevel(persistedScale)
        })
      })
    }

    const persistedCurrentCanvasWorkspace = this._storageService.get(
      CURRENT_CANVAS_WORKSPACE_KEY,
      StorageScope.WORKSPACE,
    )
    if (persistedCurrentCanvasWorkspace != null) {
      const currentCanvasWorkspace = JSON.parse(
        persistedCurrentCanvasWorkspace,
      ) as CanvasWorkspace
      WorkspaceStoreWrapper.workspaceStoreIsInitialized.p.then(() => {
        RendererManager.rendererManagerIsInitialized.p.then(() => {
          WorkspaceStoreWrapper.getWorkspaceState().setCurrentCanvasWorkspace({
            name: currentCanvasWorkspace.name,
            uniqueId: currentCanvasWorkspace.uniqueId,
            groupIdSet: currentCanvasWorkspace.groupIdSet.length
              ? currentCanvasWorkspace.groupIdSet
              : [],
            serializedState: currentCanvasWorkspace.serializedState,
            cameraPosition: new Vector(
              currentCanvasWorkspace.cameraPosition.x,
              currentCanvasWorkspace.cameraPosition.y,
            ),
            canvasScale: currentCanvasWorkspace.canvasScale,
          })
        })
      })
    }

    this._codeEditorService.onCodeEditorRemove((codeEditor) => {
      WorkspaceStoreWrapper.getWorkspaceState().respondToCodeEditorClosing(
        codeEditor,
      )
    })

    this._editorService.onDidCloseEditor((e) => {
      WorkspaceStoreWrapper.getWorkspaceState().respondToEditorClosing({
        editor: e.editor,
        groupId: e.groupId,
      })
    })

    this.initializeCopilotSettings()
  }

  public isShowingContextMenu(): boolean {
    return this.contextMenuVisible
  }

  public saveEditor(
    identifier: IEditorIdentifier,
  ): Promise<ISaveEditorsResult> {
    return this._editorService.save(identifier)
  }

  public onSaveEditor(uri: URI): void {
    WorkspaceStoreWrapper.getWorkspaceState().onSaveEditor(uri)
  }

  public addOnDidSaveListener(listener: () => void): IDisposable {
    return this._textFileService.onDidSave(listener)
  }

  public getModel(uri: URI): ITextModel | null {
    return this._modelService.getModel(uri)
  }

  public async getOrCreateModel(uri: URI): Promise<ITextModel | null> {
    let model = this.getModel(uri)
    if (model != null) return model

    const languageId =
      this._languageService.guessLanguageIdByFilepathOrFirstLine(uri)
    if (languageId == null) return null

    const languageSelection = this._languageService.createById(languageId)
    const content = await this._textFileService.readStream(uri, {
      acceptTextOnly: true,
    })

    // Due to asynchronous behavior, check again if model exists.
    model = this.getModel(uri)
    if (model != null) return model

    const resolvedModel = this._modelService.createModel(
      content.value,
      languageSelection,
      uri,
    )

    return resolvedModel
  }

  public async getOrCreateTextModelRef(
    uri: URI,
  ): Promise<IReference<ITextFileEditorModel> | null> {
    try {
      await this._textFileService.files.resolve(uri, {
        reload: { async: true }, // trigger a reload of the model if it exists already but do not wait to show the model
        reason: TextFileResolveReason.OTHER,
        allowBinary: false,
        limits: { size: getLargeFileConfirmationLimit(uri) },
      })
    } catch {
      return null
    }

    // This is a bit ugly, because we first resolve the model and then resolve a model reference. the reason being that binary
    // or very large files do not resolve to a text file model but should be opened as binary files without text. First calling into
    // resolve() ensures we are not creating model references for these kind of resources.
    // In addition we have a bit of payload to take into account (encoding, reload) that the text resolver does not handle yet.
    const model = (await this._textModelService.createModelReference(
      uri,
    )) as IReference<ITextFileEditorModel>

    if (model.object.textEditorModel == null) {
      return null
    }

    return model
  }

  public getContainer(window: CodeWindow): HTMLElement | null {
    return this._layoutService.getContainer(window)
  }

  public async createFileEditor(
    uri: URI | undefined,
    args?: EditorOpenArgs,
    options?: IEditorOptions,
  ) {
    if (uri?.path.startsWith("/scratchpad") || uri?.path === "/") {
      return undefined
    }

    // Finds an existing editor first, if it exists.
    if (!args?.forceNewEditor && uri != null) {
      const editors = this._editorService.findEditors(uri)

      for (const editorIdentifier of editors) {
        const editorInput = editorIdentifier.editor

        for (const editorPane of this._editorService.visibleEditorPanes) {
          if (
            editorPane.group.id === editorIdentifier.groupId &&
            editorInput.matches(editorPane.input) &&
            isCodeEditor(editorPane.getControl())
          ) {
            const editor = editorPane.getControl() as ICodeEditor

            const editRange = editor.getEditRange()

            // If the editor has an edit range, but we are not seeking
            // a specific range, open a new editor.
            if (
              args?.selectionRange == null &&
              options?.range == null &&
              editRange != null
            ) {
              break
            }

            // Check if the range of the editor encompasses the selection range.
            if (
              args?.selectionRange &&
              editRange &&
              !Range.containsRange(editRange, args.selectionRange)
            ) {
              break
            }

            // Check if the symbol editor contains the symbol's range that we're opening
            // the editor for.
            if (
              options?.range &&
              editRange &&
              !Range.equalsRange(editRange, options.range)
            ) {
              break
            }

            if (args?.selectionRange) {
              // Found the editor, just set the range and return
              editor.setSelection(args.selectionRange)
              editor.revealLineInCenterIfOutsideViewport(
                args.selectionRange.startLineNumber,
              )
            }

            if (
              WorkspaceStoreWrapper.getWorkspaceState().panToEditorWithIdentifier(
                editorIdentifier,
              )
            ) {
              return Promise.resolve(editorPane)
            }
          }
        }
      }
    }

    // Finds an existing editor first, if it exists.
    if (
      args?.replaceExistingEditorInput != null &&
      args.replaceExistingEditorInput.input.resource != null &&
      uri != null
    ) {
      const editors = this._editorService.findEditors(
        args.replaceExistingEditorInput.input.resource,
      )

      for (const editorIdentifier of editors) {
        const editorInput = editorIdentifier.editor

        for (const editorPane of this._editorService.visibleEditorPanes) {
          if (
            editorPane.group.id === editorIdentifier.groupId &&
            editorInput.matches(editorPane.input)
          ) {
            if (
              WorkspaceStoreWrapper.getWorkspaceState().replaceEditorWithIdentifier(
                editorIdentifier,
                uri,
              )
            ) {
              return Promise.resolve(editorPane)
            }
          }
        }
      }
      return Promise.resolve(undefined)
    }

    await WorkspaceStoreWrapper.workspaceStoreIsInitialized.p
    await RendererManager.rendererManagerIsInitialized.p

    const editorPanePromise = new DeferredPromise<IEditorPane | undefined>()

    await WorkspaceStoreWrapper.getWorkspaceState().insertFileEditorAtCenterOfViewport(
      uri?.path ?? "/untitled",
      uri ?? URI.file("/untitled"),
      editorPanePromise,
      args,
      options,
    )

    return editorPanePromise.p
  }

  public async createMergeEditor(
    input: IResourceMergeEditorInput,
    args?: EditorOpenArgs,
  ) {
    await WorkspaceStoreWrapper.workspaceStoreIsInitialized.p
    await RendererManager.rendererManagerIsInitialized.p

    // Finds an existing editor first, if it exists.
    if (!args?.forceNewEditor) {
      for (const editorPane of this._editorService.visibleEditorPanes) {
        const editor = editorPane.getControl()
        if (isMergeEditor(editor)) {
          const editorInput = editor.input as unknown as IResourceMergeEditorInput

          if (
            editorInput.input1.resource.path !==
            input.input1.resource.path ||
            editorInput.input2.resource.path !==
            input.input2.resource.path
          ) {
            continue
          }

          if (args?.selectionRange) {
            // Found the editor, just set the range and return
            editor.getControl()?.setSelection(args.selectionRange)
            editor.getControl()?.revealLineInCenterIfOutsideViewport(
              args.selectionRange.startLineNumber,
            )
          }

          if (
            WorkspaceStoreWrapper.getWorkspaceState().panToEditorWithIdentifier(
              {
                editor: editorPane.input,
                groupId: editorPane.group.id,
              },
            )
          ) {
            return Promise.resolve(editorPane)
          }
        }
      }
    }

    const deferredEditorPanePromise = new DeferredPromise<
      IEditorPane | undefined
    >()

    await WorkspaceStoreWrapper.getWorkspaceState().insertMergeEditorAtCenterOfViewport(
      input,
      args,
      undefined,
      deferredEditorPanePromise,
    )

    return deferredEditorPanePromise.p
  }

  public createReferenceEditor(
    referencesModel: ReferencesModel,
    codeEditor: ICodeEditor,
    range: IRange,
  ) {
    WorkspaceStoreWrapper.getWorkspaceState().createReferencesEditor(
      referencesModel,
      codeEditor,
      range,
    )
  }

  public async createFileDiffEditor(
    originalUri: URI,
    modifiedUri: URI,
    args?: EditorOpenArgs,
  ) {
    await WorkspaceStoreWrapper.workspaceStoreIsInitialized.p
    await RendererManager.rendererManagerIsInitialized.p

    // Finds an existing editor first, if it exists.
    if (!args?.forceNewEditor && originalUri != null && modifiedUri != null) {
      for (const editorPane of this._editorService.visibleEditorPanes) {
        if (isDiffEditor(editorPane.getControl())) {
          const editor = editorPane.getControl() as IDiffEditor

          if (
            editor.getOriginalEditor().getModel()?.uri.fsPath !==
            originalUri.fsPath ||
            editor.getModifiedEditor().getModel()?.uri.fsPath !==
            modifiedUri.fsPath
          ) {
            continue
          }

          if (args?.selectionRange) {
            // Found the editor, just set the range and return
            editor.setSelection(args.selectionRange)
            editor.revealLineInCenterIfOutsideViewport(
              args.selectionRange.startLineNumber,
            )
          }

          if (
            WorkspaceStoreWrapper.getWorkspaceState().panToEditorWithIdentifier(
              {
                editor: editorPane.input,
                groupId: editorPane.group.id,
              },
            )
          ) {
            return Promise.resolve(editorPane)
          }
        }
      }
    }

    const deferredEditorPanePromise = new DeferredPromise<
      IEditorPane | undefined
    >()

    await WorkspaceStoreWrapper.getWorkspaceState().insertFileDiffEditorAtCenterOfViewport(
      modifiedUri.path,
      originalUri,
      modifiedUri,
      deferredEditorPanePromise,
      args,
    )

    return deferredEditorPanePromise.p
  }

  public async createCopilotSettingsEditor() {
    await WorkspaceStoreWrapper.workspaceStoreIsInitialized.p
    WorkspaceStoreWrapper.getWorkspaceState().insertCopilotSettingsEditorAtCenterofViewport()
  }

  public async createHaystackKeybindingsEditor() {
    await WorkspaceStoreWrapper.workspaceStoreIsInitialized.p
    WorkspaceStoreWrapper.getWorkspaceState().insertHaystackKeybindingsEditorAtCenterOfViewport()
  }

  public focusOnEditorContainer(): void {
    WorkspaceStoreWrapper.getWorkspaceState().focusOnEditorContainer()
  }

  public async createSymbolEditorWithSymbol(
    name: string,
    symbolType: SymbolKind,
    uri: URI,
    range: IRange,
    args?: EditorOpenArgs,
    options?: IEditorOptions,
  ) {
    // Finds an existing editor first, if it exists.
    if (!args?.forceNewEditor && uri != null) {
      const editors = this._editorService.findEditors(uri)

      for (const editorIdentifier of editors) {
        const editorInput = editorIdentifier.editor

        for (const editorPane of this._editorService.visibleEditorPanes) {
          if (
            editorPane.group.id === editorIdentifier.groupId &&
            editorInput.matches(editorPane.input)
          ) {
            const editor = editorPane.getControl() as ICodeEditor
            if (editor.getEditRange() == null) continue

            const editorEditRange = editor.getEditRange()!

            // Checks if the symbol is the same.
            const cancellationToken = new CancellationTokenSource()
            const model = editor.getModel()

            if (model != null) {
              const outlineModel = await this._outlineModelService.getOrCreate(
                model,
                cancellationToken.token,
              )

              const symbolAtPosition = outlineModel.getItemEnclosingPosition({
                lineNumber: editorEditRange.startLineNumber,
                column: editorEditRange.startColumn,
              })

              if (
                symbolAtPosition == null ||
                symbolAtPosition.symbol.name !== name ||
                symbolAtPosition.symbol.kind !== symbolType ||
                !Range.equalsRange(symbolAtPosition.symbol.range, range)
              ) {
                break
              }
            }

            if (args?.selectionRange) {
              // Found the editor, just set the range and return
              editor.setSelection(args.selectionRange)
              editor.revealLineInCenterIfOutsideViewport(
                args.selectionRange.startLineNumber,
              )
            }

            if (
              WorkspaceStoreWrapper.getWorkspaceState().panToEditorWithIdentifier(
                editorIdentifier,
              )
            ) {
              return undefined
            }
          }
        }
      }
    }

    await WorkspaceStoreWrapper.workspaceStoreIsInitialized.p
    await RendererManager.rendererManagerIsInitialized.p

    const deferredEditorPanePromise = new DeferredPromise<
      IEditorPane | undefined
    >()

    const focusededitorId =
      WorkspaceStoreWrapper.getWorkspaceState().focusedEditorId
    const editorId =
      await WorkspaceStoreWrapper.getWorkspaceState().insertSymbolEditorAtCenterOfViewport(
        name,
        symbolType,
        range,
        uri.path,
        uri,
        deferredEditorPanePromise,
        args,
        options,
      )
    if (args?.unconditionallyAddDependencyRange && focusededitorId) {
      const spatialSortMiddleware = middlewareManager.getMiddleware(
        MiddlewareType.SPATIAL_SORT,
      ) as SpatialSortMiddleware

      spatialSortMiddleware.unconditionallyAddRelationship(
        [args.unconditionallyAddDependencyRange],
        focusededitorId,
        editorId,
      )
    }

    return deferredEditorPanePromise.p
  }

  public async getSourceCode(uri: URI) {
    if (uri.path === "/untitled") {
      return ""
    }
    const model = this._modelService.getModel(uri)
    if (model != null) {
      return model.getValue()
    }
    const file = await this._textFileService.read(uri)
    return file.value
  }

  public async createEditorElement(
    uri: URI,
    domElement: HTMLElement,
    deferredEditorPanePromise: DeferredPromise<IEditorPane | undefined> | null,
    canvasCodeEditor?: CanvasCodeEditor,
    options?: IEditorOptions,
    args?: EditorOpenArgs,
  ): Promise<IEditorIdentifier | null> {
    const input: IUntypedEditorInput = {
      resource: uri.path === "/untitled" ? undefined : uri,
      editRange: options?.range,
      options: {
        ...options,
        forceReload: true,
        selection: args?.selectionRange,
      },
      languageId: args?.languageId,
    }

    let editorPane: IEditorPane | undefined = undefined

    if (args?.existingEditorInput) {
      const groupId = args.existingEditorInput.groupId
      const group = this.editorGroupService.getGroup(groupId)
      if (group != null) {
        editorPane = await group.openEditor(
          args.existingEditorInput.input,
          options,
          undefined,
          domElement,
        )
      }
    }

    if (editorPane == null) {
      const group = this.editorGroupService.addGroup(
        this.editorGroupService.activeGroup,
        GroupDirection.RIGHT,
      )
      editorPane = await this._editorService.openEditor(
        input,
        group,
        undefined,
        domElement,
      )
    }

    deferredEditorPanePromise?.complete(editorPane)

    if (editorPane == null || editorPane.input == null) {
      return null
    }

    const identifier: IEditorIdentifier = {
      editor: editorPane.input,
      groupId: editorPane.group.id,
    }

    if (canvasCodeEditor != null && editorPane instanceof NotebookEditor) {
      canvasCodeEditor.notebookEditor = editorPane
      this._store.add(
        editorPane.onDidFocus(() => {
          this.focusOnNotebookEditor(editorPane)
        }),
      )

      this._store.add(
        editorPane.onDidBlur(() => {
          if (
            WorkspaceStoreWrapper.getWorkspaceState().floatingToolbarElement?.contains(
              document.activeElement,
            )
          ) {
            return
          }

          this.blurNotebookEditor(editorPane)
        }),
      )
    }

    if (canvasCodeEditor != null && editorPane instanceof WebviewEditor) {
      canvasCodeEditor.webviewEditor = editorPane
    }

    const codeEditor = editorPane.getControl()
    if (codeEditor != null && isCodeEditor(codeEditor)) {
      if (args != null) {
        if (args.scrollPosition != null) {
          const visiblePosition = codeEditor.getScrolledVisiblePosition({
            lineNumber: args.scrollPosition,
            column: 0,
          })?.top
          if (visiblePosition != null) {
            codeEditor.forceScrollTopForFiveFrames(visiblePosition)
          }
        }

        if (args.highlightRange != null) {
          const modelNow = codeEditor.getModel()
          const decorations = codeEditor.createDecorationsCollection([
            {
              range: args.highlightRange,
              options: {
                description: "symbol-navigate-action-highlight",
                className: "symbolHighlight",
              },
            },
          ])

          setTimeout(() => {
            if (codeEditor.getModel() === modelNow) {
              decorations.clear()
            }
          }, 1000)
        }
      }
    }

    return identifier
  }

  public createReferenceEditorElement(
    domElement: HTMLElement,
    referencesModel: ReferencesModel,
    codeEditor: ICodeEditor,
    range: IRange,
    editorId: string,
  ): HaystackReferenceWidget {
    const referencesController = ReferencesController.get(codeEditor)
    const referenceWidget = referencesController!.toggleWidget(
      domElement,
      createCancelablePromise((_) => Promise.resolve(referencesModel)),
      range,
      true,
      editorId,
    )
    return referenceWidget
  }

  public async createGhostEditorElement(
    originalUri: URI,
    scratchUri: URI,
    domElement: HTMLElement,
    value: string,
    editRange: IRange | null,
  ): Promise<IEditorIdentifier | null> {
    const originalValue = await this.getSourceCode(originalUri)

    const input: IResourceEditorInput = {
      resource: scratchUri,
      options: {
        transient: true,
        isGhost: true,
        ghostValue: originalValue,
        preserveFocus: true,
      },
    }

    const group = this.editorGroupService.addGroup(
      this.editorGroupService.activeGroup,
      GroupDirection.RIGHT,
    )

    const editorPane = await this._editorService.openEditor(
      input,
      group,
      undefined,
      domElement,
    )

    // Add the ghost editor value to the scratch file.
    const scratchModelRef = await this.getOrCreateTextModelRef(scratchUri)

    // Attune the tabbing.
    if (
      scratchModelRef != null &&
      scratchModelRef.object.textEditorModel != null &&
      editRange != null
    ) {
      const scratchModel = scratchModelRef.object.textEditorModel
      const indent = scratchModel.getLineIndentColumn(editRange.startLineNumber)
      const tabSize = scratchModel.getOptions().tabSize

      const valueByLine = value.split("\n")
      const endValues: string[] = []

      for (
        let valueLineIndex = 0;
        valueLineIndex < valueByLine.length;
        ++valueLineIndex
      ) {
        let value = ""

        // We want to skip the last line, since it's irrelevant
        // for indentation and will likely cause the last line to be
        // improperly indented.
        if (valueLineIndex < valueByLine.length - 1) {
          for (let i = 0; i < indent; ++i) {
            for (let j = 0; j < tabSize; ++j) {
              value += " "
            }
          }
        }

        value += valueByLine[valueLineIndex]
        endValues.push(value)
      }

      const finalValue = scratchModel.normalizeIndentation(endValues.join("\n"))

      scratchModel.applyEdits([
        {
          range: {
            startLineNumber: editRange.startLineNumber,
            startColumn: editRange.startColumn,
            endLineNumber: editRange.startLineNumber,
            endColumn: editRange.startColumn,
          },
          text: finalValue,
        },
      ])

      scratchModelRef.object.setDirty(false)
    }

    const codeEditor = editorPane?.getControl() as ICodeEditor

    if (editRange != null) {
      codeEditor.revealLineInCenter(editRange.startLineNumber)

      // Highlight non-line-breaks in the ghost range.
      let valueStart = 0
      let startLine = editRange.startLineNumber
      while (value.charAt(valueStart) === "\n") {
        ++valueStart
        ++startLine
      }

      let endLine = editRange.endLineNumber - 1
      let valueEnd = value.length - 1
      while (value.charAt(valueEnd) === "\n") {
        --valueEnd
        --endLine
      }

      codeEditor.changeDecorations((accessor) => {
        accessor.addDecoration(
          {
            startLineNumber: startLine,
            startColumn: 1,
            endLineNumber: endLine,
            endColumn: 1,
          },
          {
            isWholeLine: true,
            marginClassName: "gutter-insert",
            description: "ghost-range",
            className: "line-insert",
          },
        )
      })
    }

    if (editorPane == null || editorPane.input == null) return null

    return {
      editor: editorPane.input,
      groupId: editorPane.group.id,
    }
  }

  public async createDiffEditorElement(
    modifiedUri: URI,
    originalURI: URI,
    domElement: HTMLElement,
    deferredEditorPanePromise: DeferredPromise<IEditorPane | undefined> | null,
    options?: IEditorOptions,
    args?: EditorOpenArgs,
  ): Promise<TextDiffEditor | null> {
    const newGroup = this.editorGroupService.addGroup(
      this.editorGroupService.activeGroup,
      GroupDirection.RIGHT,
    )
    const editorPane = await this._editorService.openEditor(
      {
        original: { resource: originalURI },
        modified: { resource: modifiedUri },
        options,
      },
      newGroup,
      undefined,
      domElement,
    )

    deferredEditorPanePromise?.complete(editorPane)

    if (editorPane == null || editorPane.input == null) return null

    if (editorPane.getControl() != null && args != null) {
      const editor = editorPane.getControl()! as IDiffEditor

      if (args.selectionRange != null) {
        editor.setSelection(args.selectionRange)
        editor.revealRangeNearTopIfOutsideViewport(args.selectionRange)
      }

      if (args.highlightRange != null) {
        const modelNow = editor.getModel()
        const decorations = editor.createDecorationsCollection([
          {
            range: args.highlightRange,
            options: {
              description: "symbol-navigate-action-highlight",
              className: "symbolHighlight",
            },
          },
        ])

        setTimeout(() => {
          if (editor.getModel() === modelNow) {
            decorations.clear()
          }
        }, 1000)
      }
    }

    return editorPane as TextDiffEditor
  }

  async closeEditor(
    { editor, groupId }: IEditorIdentifier,
    options?: ICloseEditorOptions,
  ): Promise<boolean> {
    const group = this.editorGroupService.getGroup(groupId)
    if (group == null) return false

    return group.closeEditor(editor, { ...options, preserveFocus: true })
  }

  public getWorkspacePath(): string {
    const workspaceFolders = this.contextService.getWorkspace().folders
    if (workspaceFolders.length === 0) return ""

    return workspaceFolders[0].uri.path
  }

  public async getLineMetadataForFile(
    uri: URI,
    editRange?: IRange,
  ): Promise<LineMetadata> {
    if (uri.fsPath === "/untitled") {
      return {
        numLines: editRange
          ? editRange.endLineNumber - editRange.startLineNumber + 1
          : 50,
        longestLineColumn: 80,
      }
    }

    const modelRef = await this.getOrCreateTextModelRef(uri)

    if (modelRef?.object.textEditorModel == null) {
      return {
        numLines: editRange
          ? editRange.endLineNumber - editRange.startLineNumber + 1
          : 50,
        longestLineColumn: 40,
      }
    }

    const longestLineColumn = getMaxColumn(
      modelRef.object.textEditorModel,
      editRange,
    )

    const lineCount = modelRef.object.textEditorModel.getLineCount()
    modelRef.dispose()

    return {
      numLines: editRange
        ? editRange.endLineNumber - editRange.startLineNumber + 1
        : lineCount,
      longestLineColumn: longestLineColumn,
    }
  }

  override dispose(): void {
    super.dispose()
  }

  public async getSymbolUpOneLevel(
    { editor, groupId }: IEditorIdentifier,
    editRange: IRange,
  ): Promise<SymbolResult | undefined> {
    const codeEditor = this.getCodeEditor(editor, groupId)

    if (
      codeEditor == null ||
      codeEditor.getModel() == null ||
      codeEditor.getSelection() == null
    ) {
      return undefined
    }

    const symbols = await this.getSymbolStackAtPositionOutline(
      editRange,
      codeEditor.getModel()!,
    )

    const nextSymbol = symbols.pop()

    return {
      symbol: nextSymbol ?? null,
      codeEditor,
    }
  }

  public async getSymbolDownOneLevel(
    { editor, groupId }: IEditorIdentifier,
    editRange: IRange | null,
  ): Promise<SymbolResult | null | undefined> {
    const codeEditor = this.getCodeEditor(editor, groupId)

    if (
      codeEditor == null ||
      codeEditor.getModel() == null ||
      codeEditor.getSelection() == null
    ) {
      return undefined
    }

    const selection = codeEditor.getSelection()!

    const symbols = await this.getSymbolStackAtPositionOutline(
      {
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLineNumber: selection.startLineNumber,
        endColumn: selection.endColumn,
      },
      codeEditor.getModel()!,
    )

    if (symbols.length === 0) return undefined

    if (editRange == null) {
      return {
        symbol: symbols[0],
        codeEditor,
      }
    }

    let bottomSymbol: DocumentSymbol | undefined
    const symbolEditRange = new Range(
      editRange.startLineNumber,
      editRange.startColumn,
      editRange.endLineNumber,
      editRange.endColumn,
    )

    let symbolDownOneLevel: DocumentSymbol | undefined = undefined
    while ((bottomSymbol = symbols.pop())) {
      if (symbolEditRange.strictContainsRange(bottomSymbol.range)) {
        symbolDownOneLevel = bottomSymbol
      } else {
        break
      }
    }

    if (symbolDownOneLevel == null) {
      return undefined
    }

    return {
      symbol: symbolDownOneLevel,
      codeEditor,
    }
  }

  public async getDeepestSymbol({
    editor,
    groupId,
  }: IEditorIdentifier): Promise<SymbolResult | undefined> {
    const codeEditor = this.getCodeEditor(editor, groupId)

    if (
      codeEditor == null ||
      codeEditor.getModel() == null ||
      codeEditor.getSelection() == null
    ) {
      return undefined
    }

    const selection = codeEditor.getSelection()!
    const symbols = await this.getSymbolStackAtPositionOutline(
      {
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLineNumber: selection.startLineNumber,
        endColumn: selection.endColumn,
      },
      codeEditor.getModel()!,
    )

    const deepestSymbol = symbols.pop()

    if (deepestSymbol == null) return undefined
    // if (codeEditor.getEditRange()) {
    //   if (
    //     Range.containsRange(codeEditor.getEditRange()!, deepestSymbol.range)
    //   ) {
    //     return undefined
    //   }
    // }

    return {
      symbol: deepestSymbol,
      codeEditor,
    }
  }

  public async getDeepestSymbolContainingRange(
    location: Location,
  ): Promise<DocumentSymbol | null> {
    const model = await this.getOrCreateTextModelRef(location.uri)
    if (model == null || model.object.textEditorModel == null) return null

    const isRegistered = await this.waitForLanguageSymbolRegistry(
      model.object.textEditorModel,
    )
    if (!isRegistered) return null

    const providers =
      this._languageFeaturesService.documentSymbolProvider.ordered(
        model.object.textEditorModel,
      )
    const documentSymbols: DocumentSymbol[] = []

    for (const provider of providers) {
      const source = new CancellationTokenSource()
      const symbols = await provider.provideDocumentSymbols(
        model.object.textEditorModel,
        source.token,
      )
      if (symbols == null) continue
      documentSymbols.push(...symbols)
    }

    let symbol: DocumentSymbol | null = null
    let documentSymbol: DocumentSymbol | undefined

    while ((documentSymbol = documentSymbols.pop())) {
      if (Range.containsRange(documentSymbol.range, location.range)) {
        symbol = documentSymbol

        // Recurse further into the symbol subtree.
        if ((documentSymbol.children?.length ?? 0) > 0) {
          documentSymbols.push(...documentSymbol.children!)
        }
      }
    }

    model.dispose()
    return symbol
  }

  private async waitForLanguageSymbolRegistry(
    model: ITextModel,
  ): Promise<boolean> {
    if (this._languageFeaturesService.documentSymbolProvider.has(model)) {
      return true
    }

    const symbolProviderRegistryPromise = new DeferredPromise<boolean>()

    // Resolve promise when registry knows model
    const symbolProviderListener = this._store.add(
      this._languageFeaturesService.documentSymbolProvider.onDidChange(() => {
        if (this._languageFeaturesService.documentSymbolProvider.has(model)) {
          symbolProviderListener.dispose()

          symbolProviderRegistryPromise.complete(true)
        }
      }),
    )

    // Resolve promise when we get disposed too
    this._store.add(
      toDisposable(() => symbolProviderRegistryPromise.complete(false)),
    )

    return symbolProviderRegistryPromise.p
  }

  private async getSymbolStackAtPositionOutline(
    range: IRange,
    model: ITextModel,
  ): Promise<DocumentSymbol[]> {
    const token = new CancellationTokenSource()
    const outline = await this._outlineModelService.getOrCreate(
      model,
      token.token,
    )
    const documentSymbols = outline.getTopLevelSymbols()
    let documentSymbol: DocumentSymbol | undefined = undefined

    const symbolStack: DocumentSymbol[] = []

    while ((documentSymbol = documentSymbols.pop())) {
      // Recurse further into the symbol subtree.
      if (Range.strictContainsRange(documentSymbol.range, range)) {
        symbolStack.push(documentSymbol)

        if (
          this.isValidContainerSymbol(documentSymbol) &&
          (documentSymbol.children?.length ?? 0 > 0)
        ) {
          documentSymbols.push(...documentSymbol.children!)
        }
      }
    }

    return symbolStack
  }

  // /**
  //  * Returns the code editor for a given editor input and editor group ID.
  //  * @param editor The editor input for which to obtain the code editor.
  //  * @param groupId The ID of the editor group to which the code editor belongs.
  //  */
  public getCodeEditor(
    editor: EditorInput,
    groupId: number,
  ): ICodeEditor | null {
    for (const editorPane of this._editorService.visibleEditorPanes) {
      // TODO: Figure out why more rigorous checks fail in C.
      if (editorPane.group.id === groupId) {
        const maybeCodeEditor = editorPane.getControl()
        if (isCodeEditor(maybeCodeEditor)) {
          return maybeCodeEditor
        }
      }
    }

    return null
  }

  public async createSymbolEditorWithPosition(
    name: string,
    symbolType: SymbolKind,
    uri: URI,
    range: IRange,
    args?: EditorOpenArgs,
  ): Promise<void> {
    // Finds an existing editor first, if it exists.
    if (!args?.forceNewEditor && uri != null) {
      const editors = this._editorService.findEditors(uri)

      for (const editorIdentifier of editors) {
        const editorInput = editorIdentifier.editor

        for (const editorPane of this._editorService.visibleEditorPanes) {
          if (
            editorPane.group.id === editorIdentifier.groupId &&
            editorInput.matches(editorPane.input)
          ) {
            const editor = editorPane.getControl() as ICodeEditor
            if (editor.getEditRange() == null) continue

            const editorEditRange = editor.getEditRange()!

            // Checks if the symbol is the same.
            const cancellationToken = new CancellationTokenSource()
            const model = editor.getModel()

            if (model != null) {
              const outlineModel = await this._outlineModelService.getOrCreate(
                model,
                cancellationToken.token,
              )

              const symbolAtPosition = outlineModel.getItemEnclosingPosition({
                lineNumber: editorEditRange.startLineNumber,
                column: editorEditRange.startColumn,
              })

              if (
                symbolAtPosition == null ||
                symbolAtPosition.symbol.name !== name ||
                symbolAtPosition.symbol.kind !== symbolType ||
                !Range.equalsRange(symbolAtPosition.symbol.range, range)
              ) {
                break
              }
            }

            if (args?.selectionRange) {
              // Found the editor, just set the range and return
              editor.setSelection(args.selectionRange)
              editor.revealLineInCenterIfOutsideViewport(
                args.selectionRange.startLineNumber,
              )
            }

            if (
              WorkspaceStoreWrapper.getWorkspaceState().panToEditorWithIdentifier(
                editorIdentifier,
              )
            ) {
              return undefined
            }
          }
        }
      }
    }

    const model = await this.getOrCreateModel(uri)
    if (model == null) return

    const symbolStack = await this.getSymbolStackAtPositionOutline(range, model)

    let symbol: DocumentSymbol | undefined = undefined
    while ((symbol = symbolStack.pop())) {
      if (symbol.name === name && symbol.kind === symbolType) {
        break
      }
    }
    if (symbol == null) {
      await this.createFileEditor(uri, {
        selectionRange: {
          startLineNumber: range.startLineNumber,
          endLineNumber: range.startLineNumber,
          startColumn: range.startColumn,
          endColumn: range.startColumn,
        },
      })
      return
    }

    await this.createSymbolEditorWithSymbol(name, symbolType, uri, symbol.range)
  }

  isValidContainerSymbol(documentSymbol: DocumentSymbol): boolean {
    switch (documentSymbol.kind) {
      case SymbolKind.Class:
      case SymbolKind.Interface:
      case SymbolKind.Namespace:
      case SymbolKind.Object:
      case SymbolKind.Module:
      case SymbolKind.Package:
      case SymbolKind.Struct:
        return true
      case SymbolKind.Function:
      case SymbolKind.Method:
        return documentSymbol.name.toLowerCase().startsWith("describe")
      default:
        return false
    }
  }

  dirtyModel(uri: URI): void {
    this._textFileService.dirtyModel(uri)
  }

  public getInitialEditorWidth(): number {
    const editorConfig =
      this.configurationService.getValue<IEditorConfiguration>()
    const haystackEditorOption = editorConfig.editor.haystackEditor
    return haystackEditorOption.initialWidth
  }

  public getCopilotOptOut(): boolean {
    const editorConfig =
      this.configurationService.getValue<IEditorConfiguration>()
    const haystackEditorOption = editorConfig.editor.haystackEditor
    return haystackEditorOption.copilotOptOut
  }

  public getEnableSymbolAtFileSelection(): boolean {
    const editorConfig =
      this.configurationService.getValue<IEditorConfiguration>()
    const haystackEditorOption = editorConfig.editor.haystackEditor

    return haystackEditorOption.enableSymbolAtFileSelection
  }

  public getCanMiddleClickToCloseEditors(): boolean {
    const editorConfig =
      this.configurationService.getValue<IEditorConfiguration>()
    const haystackEditorOption = editorConfig.editor.haystackEditor
    return haystackEditorOption.middleMouseClickToCloseEditors
  }

  public getHideCanvasDots(): boolean {
    const editorConfig =
      this.configurationService.getValue<IEditorConfiguration>()
    const haystackEditorOption = editorConfig.editor.haystackEditor
    return haystackEditorOption.hideCanvasDots
  }

  public async createModalEditor(
    input: EditorInput | IResourceEditorInput,
    args?: EditorOpenArgs,
    options?: IEditorOptions,
  ): Promise<IEditorPane | undefined> {
    await WorkspaceStoreWrapper.workspaceStoreIsInitialized.p
    await RendererManager.rendererManagerIsInitialized.p

    const deferredEditorPanePromise = new DeferredPromise<
      IEditorPane | undefined
    >()

    // Finds an existing editor first, if it exists.
    if (input.resource != null) {
      const editors = this._editorService.findEditors(input.resource)
      const originalUriString = input.resource.toString()

      for (const editorIdentifier of editors) {
        const editorInput = editorIdentifier.editor

        if (editorInput.resource?.toString() === originalUriString) {
          if (
            WorkspaceStoreWrapper.getWorkspaceState().panToEditorWithIdentifier(
              editorIdentifier,
            )
          ) {
            return
          }
        }
      }
    }

    WorkspaceStoreWrapper.getWorkspaceState().insertModalEditorAtCenterOfViewport(
      input,
      args,
      options,
      deferredEditorPanePromise,
    )

    return deferredEditorPanePromise.p
  }

  public async createModalEditorElement(
    input: IUntypedEditorInput,
    domElement: HTMLElement,
    editor: CanvasModalEditor,
    options?: IEditorOptions,
    args?: EditorOpenArgs,
  ): Promise<IEditorIdentifier | null> {
    let editorPane: IEditorPane | undefined = undefined
    if (args?.existingEditorInput) {
      const groupId = args.existingEditorInput.groupId
      const group = this.editorGroupService.getGroup(groupId)
      if (group != null) {
        editorPane = await group.openEditor(
          args.existingEditorInput.input,
          options,
          undefined,
          domElement,
        )
      }
    }

    if (editorPane == null) {
      const group = this.editorGroupService.addGroup(
        this.editorGroupService.activeGroup,
        GroupDirection.RIGHT,
      )

      editorPane = await this._editorService.openEditor(
        input,
        group,
        undefined,
        domElement,
      )
    }

    editor.deferredPanePromise?.complete(editorPane)
    editor.editorPane = (editorPane as EditorPane) ?? null

    if (editorPane == null || editorPane.input == null) {
      return null
    }

    return {
      editor: editorPane.input,
      groupId: editorPane.group.id,
    }
  }

  public async getSymbolRelationships(
    symbolData: SortSymbolData[],
  ): Promise<SymbolRelationship[]> {
    const symbolRelationships: SymbolRelationship[] = []
    for (const toSymbolDatum of symbolData) {
      const model = await this.getOrCreateModel(toSymbolDatum.uri)
      if (model == null) continue

      const token = new CancellationTokenSource()
      const outlineModel = await this._outlineModelService.getOrCreate(
        model,
        token.token,
      )

      if (toSymbolDatum.range == null) {
        // We have a file. Find other symbol data with the same file.
        for (const fromSymbolDatum of symbolData) {
          if (toSymbolDatum === fromSymbolDatum) continue
          if (fromSymbolDatum.uri.toString() === toSymbolDatum.uri.toString()) {
            symbolRelationships.push({
              fromEditorId: fromSymbolDatum.editorId,
              toEditorId: toSymbolDatum.editorId,
              relationshipType: DependencyArrowType.SAME_FILE,
            })
          }
        }
      } else {
        // We have a symbol. Find other symbol data that are related.
        const adjustedRange = adjustRangeForComments(toSymbolDatum.range, model)
        const element = outlineModel.getItemEnclosingPosition(
          new Position(
            adjustedRange.startLineNumber,
            adjustedRange.startColumn,
          ),
        )

        if (element == null) continue

        const adjustedSelectionRange = adjustRangeForComments(
          element.symbol.selectionRange,
          model,
        )

        let position = new Position(
          adjustedSelectionRange.startLineNumber,
          adjustedSelectionRange.startColumn,
        )

        let wordAtPosition = model.getWordAtPosition(position)

        while (
          position.column <= model.getLineMaxColumn(position.lineNumber) &&
          (wordAtPosition == null ||
            wordAtPosition.word === " " ||
            wordAtPosition.word === "async" ||
            wordAtPosition.word === "public" ||
            wordAtPosition.word === "private" ||
            wordAtPosition.word === "protected" ||
            wordAtPosition.word === "function")
        ) {
          position = new Position(
            position.lineNumber,
            (wordAtPosition?.endColumn ?? position.column) + 1,
          )
          wordAtPosition = model.getWordAtPosition(position)
        }

        const references = await this.getReferencesForeditor(
          Range.fromPositions(position),
          toSymbolDatum.uri,
        )

        // Finds any symbol data that match the reference.
        for (const reference of references) {
          for (const fromSymbolDatum of symbolData) {
            if (
              fromSymbolDatum.range == null ||
              toSymbolDatum === fromSymbolDatum
            ) {
              continue
            }

            if (
              fromSymbolDatum.uri.toString() === reference.uri.toString() &&
              Range.containsRange(fromSymbolDatum.range, reference.range)
            ) {
              symbolRelationships.push({
                fromEditorId: fromSymbolDatum.editorId,
                fromLocationRange: reference.range,
                toEditorId: toSymbolDatum.editorId,
                relationshipType: DependencyArrowType.SYMBOL_DEPENDENCY,
              })
              break
            }
          }
        }
      }
    }

    return symbolRelationships
  }

  private async getReferencesForeditor(
    range: IRange,
    uri: URI,
  ): Promise<Location[]> {
    const model = this._modelService.getModel(uri)
    if (model == null) return []

    const providers =
      this._languageFeaturesService.referenceProvider.ordered(model)
    const references: Location[] = []

    for (const provider of providers) {
      const source = new CancellationTokenSource()
      const providerReferences = await provider.provideReferences(
        model,
        new Position(range.startLineNumber, range.startColumn),
        { includeDeclaration: false },
        source.token,
      )
      if (providerReferences == null) continue
      references.push(...providerReferences)
    }

    return references
  }

  public focusOnEditor(identifier: IEditorIdentifier) {
    const codeEditor = this.getCodeEditor(identifier.editor, identifier.groupId)
    if (codeEditor == null) return
    codeEditor.focus()
  }

  public async getIncomingDeps(range: IRange, uri: URI): Promise<SymbolDep[]> {
    const references = await this.getReferencesForeditor(range, uri)
    const metadata: LocationMetadata[] = []
    const modelReferences: IReference<ITextFileEditorModel>[] = []
    let refCount = 0

    for (const reference of references) {
      if (refCount >= 10) break

      const locationMetadata: LocationMetadata = {
        filePath: reference.uri.path,
        uri: reference.uri,
        identifier: reference.uri.path.split("/").pop()!,
        range,
        snippet: "",
      }

      const model = await this.getOrCreateTextModelRef(reference.uri)
      if (model == null) continue
      modelReferences.push(model)

      locationMetadata.snippet = model.object.textEditorModel!.getLineContent(
        reference.range.startLineNumber,
      )

      const symbolStack = await this.getSymbolStackAtPositionOutline(
        reference.range,
        model.object.textEditorModel!,
      )
      if (symbolStack.length === 0) {
        metadata.push(locationMetadata)
        continue
      }

      const symbol = symbolStack.pop()
      locationMetadata.enclosingSymbol = symbol

      metadata.push(locationMetadata)
      ++refCount
    }

    for (const modelRef of modelReferences) {
      modelRef.dispose()
    }

    return this.convertMetadataToDeps(metadata)
  }

  private convertMetadataToDeps(
    metadata: (LocationMetadata | null)[],
  ): SymbolDep[] {
    const symbolDepMap = new Map<string, SymbolDep>()

    for (const metadatum of metadata) {
      if (metadatum == null) continue

      const symbolDepKey = `${metadatum.filePath}-${metadatum.enclosingSymbol
        ? Range.fromIRange(metadatum.enclosingSymbol.range).toString()
        : "Null"
        }`
      let symbolDep: SymbolDep | undefined = symbolDepMap.get(symbolDepKey)

      if (symbolDep == null) {
        symbolDep = {
          identifier: metadatum.identifier,
          filePath: metadatum.filePath,
          uri: metadatum.uri,
          symbolType: metadatum.enclosingSymbol?.kind,
          range: metadatum.enclosingSymbol?.range,
          metadata: [
            {
              callRange: metadatum.range,
              fromRanges: [],
              snippet: metadatum.snippet,
            },
          ],
        }
        symbolDepMap.set(metadatum.filePath, symbolDep)
        continue
      }

      symbolDep.metadata.push({
        callRange: metadatum.range,
        fromRanges: [],
        snippet: metadatum.snippet,
      })
    }

    return [...symbolDepMap.values()]
  }

  public async getDefinition(location: Location): Promise<Location[] | null> {
    const model = await this.getOrCreateModel(location.uri)
    if (model == null) return null

    const source = new CancellationTokenSource()
    const definitionPromises: ProviderResult<Definition | LocationLink[]>[] = []
    const providers =
      this._languageFeaturesService.definitionProvider.ordered(model)
    for (const provider of providers) {
      definitionPromises.push(
        provider.provideDefinition(
          model,
          new Position(
            location.range.startLineNumber,
            location.range.startColumn,
          ),
          source.token,
        ),
      )
    }

    const definitions = await Promise.all(definitionPromises)

    return definitions.filter((definition) => !!definition).flat() as Location[]
  }

  public async convertIncomingCallsToDeps(
    calls: IncomingCall[],
  ): Promise<SymbolDep[]> {
    const symbolDeps: SymbolDep[] = []
    for (const call of calls) {
      const model = await this.getOrCreateModel(call.from.uri)
      if (model == null) continue

      const metadata: SymbolDepMetadata[] = []

      // If the call has a corrupted range, we need to manually get it.
      if (call.from.range.startLineNumber === call.from.range.endLineNumber) {
        const symbol = await this.getEnclosingSymbol(model, call.from.range)
        if (symbol != null) {
          call.from.range = symbol.range
        }
      }

      for (const range of call.fromRanges) {
        metadata.push({
          fromRanges: [],
          callRange: range,
          snippet: model.getLineContent(range.startLineNumber),
        })
      }

      symbolDeps.push({
        filePath: call.from.uri.path,
        uri: call.from.uri,
        identifier: call.from.name,
        symbolType: call.from.kind,
        range: call.from.range,
        metadata: metadata,
      })
    }

    return symbolDeps
  }

  public async convertOutgoingCallsToDeps(
    calls: OutgoingCall[],
  ): Promise<SymbolDep[]> {
    const symbolDeps: SymbolDep[] = []
    for (const call of calls) {
      const model = await this.getOrCreateModel(call.to.uri)
      if (model == null) continue

      // If the call has a corrupted range, we need to manually get it.
      if (call.to.range.startLineNumber === call.to.range.endLineNumber) {
        const symbol = await this.getEnclosingSymbol(model, call.to.range)
        if (symbol != null) {
          call.to.range = symbol.range
        }
      }

      const metadata: SymbolDepMetadata[] = []
      metadata.push({
        callRange: call.to.range,
        fromRanges: call.fromRanges,
        snippet: model.getLineContent(call.to.range.startLineNumber),
      })

      symbolDeps.push({
        filePath: call.to.uri.path,
        uri: call.to.uri,
        identifier: call.to.name,
        symbolType: call.to.kind,
        range: call.to.range,
        metadata: metadata,
      })
    }

    return symbolDeps
  }

  public async getDeepestSymbolWithPredicate(
    uri: URI,
    range: IRange,
    predicate: (symbol: DocumentSymbol) => boolean,
  ): Promise<DocumentSymbol | null> {
    const model = await this.getOrCreateModel(uri)
    if (model == null) return null

    const source = new CancellationTokenSource()
    const outlineModel = await this._outlineModelService.getOrCreate(
      model,
      source.token,
    )

    const item = outlineModel.getItemEnclosingPosition(
      new Position(range.startLineNumber, range.startColumn),
    )

    if (item == null) return null

    if (predicate(item.symbol)) {
      return item.symbol
    }

    let treeItem: TreeElement | undefined = item
    while ((treeItem = treeItem.parent)) {
      if (treeItem instanceof OutlineElement) {
        if (predicate(treeItem.symbol)) {
          return treeItem.symbol
        }
      }
    }

    return null
  }

  public async getEnclosingSymbol(
    model: ITextModel,
    editRange: IRange,
  ): Promise<DocumentSymbol | null> {
    const symbolStack = await this.getSymbolStackAtPositionOutline(
      editRange,
      model,
    )
    return symbolStack.pop() ?? null
  }

  public async getCallableSymbolAtRange(
    model: ITextModel,
    editRange: IRange,
  ): Promise<DocumentSymbol | null> {
    const source = new CancellationTokenSource()
    const outlineModel = await this._outlineModelService.getOrCreate(
      model,
      source.token,
    )

    const item = outlineModel.getItemEnclosingPosition(
      new Position(editRange.startLineNumber, editRange.startColumn),
    )

    if (item == null) return null

    // For C#, we don't care about the position at which
    // we ask for the call hierarchy.
    const filePath = model.uri.fsPath
    const ignorePosition = filePath.endsWith(".m") || filePath.endsWith(".mm")

    if (
      isCallableSymbol(item.symbol.kind) &&
      (ignorePosition ||
        model.getWordAtPosition(
          new Position(
            item.symbol.selectionRange.startLineNumber,
            item.symbol.selectionRange.startColumn,
          ),
        ) != null)
    ) {
      return item.symbol
    }

    let treeItem: TreeElement | undefined = item
    while ((treeItem = treeItem.parent)) {
      if (treeItem instanceof OutlineElement) {
        if (
          isCallableSymbol(treeItem.symbol.kind) &&
          (ignorePosition ||
            model.getWordAtPosition(
              new Position(
                treeItem.symbol.selectionRange.startLineNumber,
                treeItem.symbol.selectionRange.startColumn,
              ),
            ) != null)
        ) {
          return treeItem.symbol
        }
      }
    }

    return null
  }

  public isValidContainerOrCallableSymbol(
    documentSymbol: DocumentSymbol,
  ): boolean {
    switch (documentSymbol.kind) {
      case SymbolKind.Class:
      case SymbolKind.Interface:
      case SymbolKind.Namespace:
      case SymbolKind.Object:
      case SymbolKind.Module:
      case SymbolKind.Package:
      case SymbolKind.Struct:
      case SymbolKind.Function:
      case SymbolKind.Constructor:
      case SymbolKind.Method:
        return true
      default:
        return false
    }
  }

  public async getSymbolStackForEditor(
    identifier: IEditorIdentifier | null,
  ): Promise<DocumentSymbol[]> {
    if (identifier == null) {
      return []
    }

    const codeEditor = this.getCodeEditor(identifier.editor, identifier.groupId)
    if (
      codeEditor == null ||
      codeEditor.getModel() == null ||
      codeEditor.getSelection() == null
    ) {
      return []
    }

    return this.getSymbolStackAtPositionOutline(
      codeEditor.getSelection()!,
      codeEditor.getModel()!,
    )
  }

  public clearRelationshipHighlights(
    identifier: IEditorIdentifier,
    id: string,
  ): void {
    const editor = this.getCodeEditor(identifier.editor, identifier.groupId)
    if (editor == null) return
    editor.getModel()?.changeDecorations((accessor) => {
      accessor.removeDecoration(id)
    })
  }

  public setRelationshipHighlights(
    identifier: IEditorIdentifier,
    ranges: IRange[],
    color: number,
  ): string[] {
    const editor = this.getCodeEditor(identifier.editor, identifier.groupId)
    if (editor == null) return []

    const ids: string[] = []

    editor.getModel()?.changeDecorations((accessor) => {
      for (const range of ranges) {
        ids.push(
          accessor.addDecoration(range, {
            className: `relationship-highlight-${color
              .toString(16)
              .padStart(6, "0")}`,
            description: "relationship-highlight",
          }),
        )
      }
    })

    return ids
  }

  public resetZoomLevel(): void {
    const lastMousePosition =
      RendererManager.getInstance().getMostRecentMousePosition()
    RendererManager.getInstance().setCanvasScale(1.0, lastMousePosition)
  }

  public deleteEditor(editorId: string): void {
    WorkspaceStoreWrapper.getWorkspaceState().closeEditor(
      editorId,
      /* doNotPan */ true,
    )
  }

  public setCurrentReference(
    editorId: string,
    uri: URI,
    numberOfReferences?: number,
  ): void {
    WorkspaceStoreWrapper.getWorkspaceState().setCurrentReference(
      editorId,
      uri,
      numberOfReferences ?? null,
    )
  }

  public async getSymbolAtPosition(
    definition: LocationLink,
  ): Promise<DocumentSymbol | null> {
    const model = await this.getOrCreateModel(definition.uri)
    if (model == null) return null

    const cancellationToken = new CancellationTokenSource()
    const outlineModel = await this._outlineModelService.getOrCreate(
      model,
      cancellationToken.token,
    )

    const symbolAtPosition = outlineModel.getItemEnclosingPosition({
      lineNumber: definition.range.startLineNumber,
      column: definition.range.startColumn,
    })

    return symbolAtPosition?.symbol ?? null
  }

  public isDarkMode(): boolean {
    const colorThemeType = this._themeService.getColorTheme().type
    return (
      colorThemeType === ColorScheme.DARK ||
      colorThemeType === ColorScheme.HIGH_CONTRAST_DARK
    )
  }

  public getFocusedCodeEditor(): ICodeEditor | null {
    const editor = WorkspaceStoreWrapper.getWorkspaceState().getFocusedEditor()
    const identifier = (editor as CanvasCodeEditor).identifier
    if (identifier == null) {
      const codeEditorWidget = (editor as CanvasReferencesEditor).codeEditor
      return codeEditorWidget
    }
    const editors = this._codeEditorService.listCodeEditors()
    for (const editor of editors) {
      if (editor.getId() === identifier.editor.editorId) {
        return editor
      }
    }
    return null
  }

  public getTransformInfoForEditor(editor: EditorInput): {
    xPosition: number
    yPosition: number
    width: number
    height: number
  } | null {
    return WorkspaceStoreWrapper.getWorkspaceState().getTransformInfoForEditor(
      editor,
    )
  }

  public getIsGhostEditor(editor: EditorInput): boolean {
    return WorkspaceStoreWrapper.getWorkspaceState().isGhostEditor(editor)
  }

  public isModelIndexed(model: ITextModel): Promise<boolean> {
    return this.waitForLanguageSymbolRegistry(model)
  }

  public async showCopilotOptInNotification(): Promise<boolean> {
    const disposables = new DisposableStore()
    const choices: (IPromptChoice | IPromptChoiceWithMenu)[] = []
    const hasDismissedCopilotOptInNotification =
      this._storageService.getBoolean(
        "haystack.copilotOptInDismissed",
        StorageScope.APPLICATION,
        false,
      )

    if (hasDismissedCopilotOptInNotification) {
      return Promise.resolve(false)
    }

    choices.push(
      ...[
        {
          label: localize("Opt in", "Opt in"),
          run: () => {
            this._commandService.executeCommand(COPILOT_OPT_IN)
            this._storageService.store(
              "haystack.copilotOptInDismissed",
              true,
              StorageScope.APPLICATION,
              StorageTarget.USER,
            )
          },
        },
        {
          label: "Dismiss and don't opt in",
          run: () => {
            this._storageService.store(
              "haystack.copilotOptInDismissed",
              true,
              StorageScope.APPLICATION,
              StorageTarget.USER,
            )
          },
        },
      ],
    )

    try {
      const recommendationsNotification = disposables.add(
        new EmailNotification(
          Severity.Info,
          "Opt into Haystack's navigational copilot?",
          choices,
          this._notificationService,
        ),
      )
      recommendationsNotification.show()
      const cancellationToken = new CancellationTokenSource()

      await raceCancellation(
        new Promise((c) =>
          disposables.add(
            Event.once(recommendationsNotification.onDidClose)(c),
          ),
        ),
        cancellationToken.token,
      )
      return !recommendationsNotification.isCancelled()
    } finally {
      disposables.dispose()
    }
  }

  public async showVsCodeImportDialog(): Promise<boolean> {
    const hasDismissedNotification = this._storageService.getBoolean(
      "haystack.importFromVsCodeDismissed",
      StorageScope.APPLICATION,
      false,
    )

    if (hasDismissedNotification) {
      return Promise.resolve(false)
    }

    await this._dialogService.prompt({
      type: Severity.Info,
      message: localize("importSettings", "Welcome to Haystack!"),
      detail: "Would you like to import settings and extensions from VS Code?",
      buttons: [
        {
          label: "Yes",
          run: () => {
            this._commandService.executeCommand(IMPORT_VSCODE_SETTINGS_ID)
            this._storageService.store(
              "haystack.importFromVsCodeDismissed",
              true,
              StorageScope.APPLICATION,
              StorageTarget.MACHINE,
            )
          },
        },
        {
          label: "No",
          run: () => {
            this._storageService.store(
              "haystack.importFromVsCodeDismissed",
              true,
              StorageScope.APPLICATION,
              StorageTarget.MACHINE,
            )
          },
        },
      ],
    })

    return true
  }

  async openUrl(url: string, trusted?: boolean): Promise<void> {
    await this._openerService.open(url)
  }

  public saveCurrentCanvasWorkspace(
    workspaceName: string,
    canvasCamera: Vector,
    canvasScale: number,
  ): CanvasWorkspace {
    const uniqueId = generateUuid()

    const canvasWorkspacesString = this._storageService.get(
      CANVAS_WORKSPACE_KEY,
      StorageScope.WORKSPACE,
      "[]",
    )

    const editorPart = this.editorGroupService.getPart(
      Parts.EDITOR_PART,
    ) as EditorPart

    const serializedPart = editorPart.createState()

    const groupIdSet: number[] = []
    for (const group of this.editorGroupService.groups) {
      groupIdSet.push(group.id)
    }

    const canvasWorkspace: CanvasWorkspace = {
      uniqueId,
      name: workspaceName,
      serializedState: serializedPart,
      cameraPosition: canvasCamera,
      canvasScale,
      groupIdSet,
    }

    const canvasWorkspaces = JSON.parse(
      canvasWorkspacesString,
    ) as CanvasWorkspace[]
    canvasWorkspaces.push(canvasWorkspace)

    this._storageService.store(
      CANVAS_WORKSPACE_KEY,
      canvasWorkspaces,
      StorageScope.WORKSPACE,
      StorageTarget.MACHINE,
    )

    WorkspaceStoreWrapper.getWorkspaceState().setCanvasWorkspaces(
      canvasWorkspaces,
    )

    return canvasWorkspace
  }

  public removeCanvasWorkspace(uniqueId: string): void {
    const canvasWorkspacesString = this._storageService.get(
      CANVAS_WORKSPACE_KEY,
      StorageScope.WORKSPACE,
    )
    if (canvasWorkspacesString == null) return

    const canvasWorkspaces = JSON.parse(
      canvasWorkspacesString,
    ) as CanvasWorkspace[]

    canvasWorkspaces.splice(
      canvasWorkspaces.findIndex(
        (workspace) => workspace.uniqueId === uniqueId,
      ),
      1,
    )

    this._storageService.store(
      CANVAS_WORKSPACE_KEY,
      canvasWorkspaces,
      StorageScope.WORKSPACE,
      StorageTarget.MACHINE,
    )

    WorkspaceStoreWrapper.getWorkspaceState().setCanvasWorkspaces(
      canvasWorkspaces,
    )
  }

  openCanvasWorkspace(uniqueId: string): CanvasWorkspace | null {
    const canvasWorkspacesString = this._storageService.get(
      CANVAS_WORKSPACE_KEY,
      StorageScope.WORKSPACE,
    )
    if (canvasWorkspacesString == null) return null

    const canvasWorkspaces = JSON.parse(
      canvasWorkspacesString,
    ) as CanvasWorkspace[]
    const canvasWorkspace = canvasWorkspaces.find(
      (canvasWorkspace) => canvasWorkspace.uniqueId === uniqueId,
    )
    if (canvasWorkspace == null) return null

    const editorPart = this.editorGroupService.getPart(
      Parts.EDITOR_PART,
    ) as EditorPart
    editorPart.applyState(canvasWorkspace.serializedState)
    WorkspaceStoreWrapper.getWorkspaceState().setCamera(
      new Vector(
        canvasWorkspace.cameraPosition.x,
        canvasWorkspace.cameraPosition.y,
      ),
    )

    return {
      ...canvasWorkspace,
      cameraPosition: new Vector(
        canvasWorkspace.cameraPosition.x,
        canvasWorkspace.cameraPosition.y,
      ),
      groupIdSet: canvasWorkspace.groupIdSet.length
        ? canvasWorkspace.groupIdSet
        : [],
    }
  }

  public loadCanvasWorkspaces(): CanvasWorkspace[] {
    const canvasWorkspacesString = this._storageService.get(
      CANVAS_WORKSPACE_KEY,
      StorageScope.WORKSPACE,
    )
    if (canvasWorkspacesString == null) return []

    const canvasWorkspaces = JSON.parse(
      canvasWorkspacesString,
    ) as CanvasWorkspace[]

    return canvasWorkspaces
  }

  public overwriteCanvasWorkspace(
    currentCanvasWorkspace: CanvasWorkspace,
    canvasCamera: Vector,
    canvasScale: number,
  ): CanvasWorkspace {
    const canvasWorkspacesString = this._storageService.get(
      CANVAS_WORKSPACE_KEY,
      StorageScope.WORKSPACE,
      "[]",
    )

    const editorPart = this.editorGroupService.getPart(
      Parts.EDITOR_PART,
    ) as EditorPart

    const serializedPart = editorPart.createState()

    const groupIdSet: number[] = []
    for (const group of this.editorGroupService.groups) {
      groupIdSet.push(group.id)
    }

    const newCanvasWorkspace: CanvasWorkspace = {
      uniqueId: currentCanvasWorkspace.uniqueId,
      name: currentCanvasWorkspace.name,
      serializedState: serializedPart,
      cameraPosition: canvasCamera,
      canvasScale,
      groupIdSet,
    }

    const canvasWorkspaces = JSON.parse(
      canvasWorkspacesString,
    ) as CanvasWorkspace[]

    const currentIndex = canvasWorkspaces.findIndex(
      (canvasWorkspace) =>
        canvasWorkspace.uniqueId === currentCanvasWorkspace.uniqueId,
    )
    if (currentIndex === -1) {
      canvasWorkspaces.push(newCanvasWorkspace)
    } else {
      canvasWorkspaces[currentIndex] = newCanvasWorkspace
    }

    this._storageService.store(
      CANVAS_WORKSPACE_KEY,
      canvasWorkspaces,
      StorageScope.WORKSPACE,
      StorageTarget.MACHINE,
    )

    WorkspaceStoreWrapper.getWorkspaceState().setCanvasWorkspaces(
      canvasWorkspaces,
    )
    return newCanvasWorkspace
  }

  public async showConfirmationDialog(
    message: string,
    detail: string,
    yesLabel: string,
    noLabel?: string,
  ) {
    const buttons = []

    buttons.push({
      label: yesLabel,
      run: () => ConfirmResult.SAVE,
    })

    if (noLabel != null) {
      buttons.push({
        label: noLabel,
        run: () => ConfirmResult.DONT_SAVE,
      })
    }

    const { result } = await this._dialogService.prompt<ConfirmResult>({
      type: Severity.Warning,
      message,
      detail,
      buttons,
      cancelButton: {
        run: () => ConfirmResult.CANCEL,
      },
    })

    return result
  }

  public removeCanvasDots(): void {
    RendererManager.getInstance().removeCanvasDots()
  }

  public addCanvasDots(): void {
    RendererManager.getInstance().addCanvasDots()
  }

  async initializeCopilotSettings(): Promise<void> {
    await WorkspaceStoreWrapper.workspaceStoreIsInitialized.p
    const openAiSettingsJson = this._storageService.get(
      OPEN_AI_SETTINGS_KEY,
      StorageScope.WORKSPACE,
    )
    if (openAiSettingsJson != null) {
      const openAiSettings = JSON.parse(openAiSettingsJson) as OpenAiSettings
      WorkspaceStoreWrapper.getWorkspaceState().setOpenAiSettings(
        openAiSettings,
      )
    }
  }

  storeOpenAiSettings(openAiSettings: OpenAiSettings) {
    this._storageService.store(
      OPEN_AI_SETTINGS_KEY,
      JSON.stringify(openAiSettings),
      StorageScope.WORKSPACE,
      StorageTarget.MACHINE,
    )
  }

  public setEditorSelection(identifier: IEditorIdentifier, selection: IRange) {
    const codeEditor = this.getCodeEditor(identifier.editor, identifier.groupId)
    if (codeEditor == null) return
    codeEditor.setSelection(selection)
    codeEditor.revealLineInCenter(selection.startLineNumber)
    codeEditor.focus()
  }

  focusOnCanvas(): void {
    WorkspaceStoreWrapper.getWorkspaceState().focusOnCanvas()
  }

  goBackInEditorHistory(): void {
    WorkspaceStoreWrapper.getWorkspaceState().goToPreviousEditorInHistoryStack()
  }

  goForwardInEditorHistory(): void {
    WorkspaceStoreWrapper.getWorkspaceState().goToNextEditorInHistoryStack()
  }

  public setNavigationButtonState(
    previousStackLength: number,
    nextStackLength: number,
  ): void {
    this._contextKeyService.bufferChangeEvents(() => {
      this.canNavigateNavigationsContextKey.set(previousStackLength > 0)
      this.canNavigateForwardContextKey.set(nextStackLength > 0)
    })
  }

  getKeybindingForCommand(commandId: string): ResolvedKeybinding | undefined {
    return this._keybindingsService.lookupKeybinding(
      commandId,
      this._contextKeyService,
    )
  }

  getKeybindingForShortcut(
    scanChords: ScanCodeChord[],
    keyChords: KeyCodeChord[],
  ): ResolvedKeybinding | undefined {
    switch (OS) {
      case OperatingSystem.Linux:
      case OperatingSystem.Macintosh: {
        const keybinding = new Keybinding(keyChords)
        const keybindings = this._keyboardMapper.resolveKeybinding(keybinding)
        return keybindings.length > 0 ? keybindings[0] : undefined
      }
      case OperatingSystem.Windows: {
        const keybinding = new Keybinding(scanChords)
        const keybindings = this._keyboardMapper.resolveKeybinding(keybinding)
        return keybindings.length > 0 ? keybindings[0] : undefined
      }
    }
  }

  public goBackInSelection(): void {
    const editorId = WorkspaceStoreWrapper.getWorkspaceState().focusedEditorId
    if (editorId == null) return
    WorkspaceStoreWrapper.getWorkspaceState().goToPreviousEditorSelection(
      editorId,
    )
  }

  async goForwardInSelection(): Promise<void> {
    const editorId = WorkspaceStoreWrapper.getWorkspaceState().focusedEditorId
    if (editorId == null) return
    WorkspaceStoreWrapper.getWorkspaceState().goToNextEditorSelection(editorId)
  }

  goDownOneLevelInEditor(): void {
    const editorId = WorkspaceStoreWrapper.getWorkspaceState().focusedEditorId
    if (editorId == null) return
    const editor =
      WorkspaceStoreWrapper.getWorkspaceState().idToEditorMap.get(editorId)
    if (
      editor == null ||
      (editor.type !== CanvasEditorType.CODE_EDITOR &&
        editor.type !== CanvasEditorType.DIFF_EDITOR &&
        editor.type !== CanvasEditorType.GHOST_EDITOR)
    ) {
      return
    }

    WorkspaceStoreWrapper.getWorkspaceState().editorGoDownOneLevel(editor)
  }

  public goUpOneLevelInEditor(): void {
    const editorId = WorkspaceStoreWrapper.getWorkspaceState().focusedEditorId
    if (editorId == null) return
    const editor =
      WorkspaceStoreWrapper.getWorkspaceState().idToEditorMap.get(editorId)
    if (
      editor == null ||
      (editor.type !== CanvasEditorType.CODE_EDITOR &&
        editor.type !== CanvasEditorType.DIFF_EDITOR &&
        editor.type !== CanvasEditorType.GHOST_EDITOR)
    ) {
      return
    }

    WorkspaceStoreWrapper.getWorkspaceState().editorGoUpOneLevel(editor)
  }

  public goToFile(): void {
    const editorId = WorkspaceStoreWrapper.getWorkspaceState().focusedEditorId
    if (editorId == null) return
    const editor =
      WorkspaceStoreWrapper.getWorkspaceState().idToEditorMap.get(editorId)
    if (
      editor == null ||
      (editor.type !== CanvasEditorType.CODE_EDITOR &&
        editor.type !== CanvasEditorType.DIFF_EDITOR &&
        editor.type !== CanvasEditorType.GHOST_EDITOR)
    ) {
      return
    }

    WorkspaceStoreWrapper.getWorkspaceState().editorGoToFile(editor)
  }

  public goToDeepestSymbol(): void {
    const editorId = WorkspaceStoreWrapper.getWorkspaceState().focusedEditorId
    if (editorId == null) return
    const editor =
      WorkspaceStoreWrapper.getWorkspaceState().idToEditorMap.get(editorId)
    if (
      editor == null ||
      (editor.type !== CanvasEditorType.CODE_EDITOR &&
        editor.type !== CanvasEditorType.DIFF_EDITOR &&
        editor.type !== CanvasEditorType.GHOST_EDITOR)
    ) {
      return
    }

    WorkspaceStoreWrapper.getWorkspaceState().editorGoToDeepestSymbol(editor)
  }

  public viewIncomingDependencies(): void {
    const editorId = WorkspaceStoreWrapper.getWorkspaceState().focusedEditorId
    if (editorId == null) return
    WorkspaceStoreWrapper.getWorkspaceState().setDependencyListType(
      editorId,
      SymbolDepsType.INCOMING,
    )
  }

  public viewOutgoingDependencies(): void {
    const editorId = WorkspaceStoreWrapper.getWorkspaceState().focusedEditorId
    if (editorId == null) return
    WorkspaceStoreWrapper.getWorkspaceState().setDependencyListType(
      editorId,
      SymbolDepsType.OUTGOING,
    )
  }

  public pinCurrentEditor(): void {
    WorkspaceStoreWrapper.getWorkspaceState().pinCurrentEditor()
  }

  unpinCurrentEditor(): void {
    WorkspaceStoreWrapper.getWorkspaceState().unpinCurrentEditor()
  }

  public focusOnEditorWithWebview(origin: string): void {
    WorkspaceStoreWrapper.getWorkspaceState().focusOnEditorWithWebview(origin)
  }

  public blurEditorWithWebview(origin: string): void {
    WorkspaceStoreWrapper.getWorkspaceState().blurEditorWithWebview(origin)
  }

  public panToEditorWithIdentifier(editor: EditorInput, groupId: number): void {
    WorkspaceStoreWrapper.getWorkspaceState().panToEditorWithIdentifier({
      editor,
      groupId,
    })
  }

  public forwardPointerEvent(e: PointerEvent): void {
    const rendererManager = RendererManager.getInstance()
    rendererManager.forwardPointerEvent(e, true)
  }

  private focusOnNotebookEditor(notebookEditor: NotebookEditor): void {
    WorkspaceStoreWrapper.getWorkspaceState().focusOnNotebookEditor(
      notebookEditor,
    )
  }

  private blurNotebookEditor(notebookEditor: NotebookEditor): void {
    WorkspaceStoreWrapper.getWorkspaceState().blurNotebookEditor(notebookEditor)
  }

  public async createMergeEditorElement(
    editorInput: IResourceMergeEditorInput,
    domElement: HTMLElement,
    editor: CanvasMergeEditor,
    options?: IEditorOptions,
    args?: EditorOpenArgs,
  ): Promise<IEditorIdentifier | null> {
    let editorPane: IEditorPane | undefined = undefined
    if (args?.existingEditorInput) {
      const groupId = args.existingEditorInput.groupId
      const group = this.editorGroupService.getGroup(groupId)
      if (group != null) {
        editorPane = await group.openEditor(
          args.existingEditorInput.input,
          options,
          undefined,
          domElement,
        )
      }
    }

    if (editorPane == null) {
      const group = this.editorGroupService.addGroup(
        this.editorGroupService.activeGroup,
        GroupDirection.RIGHT,
      )

      editorPane = await this._editorService.openEditor(
        editorInput,
        group,
        undefined,
        domElement,
      )
    }

    editor.deferredPanePromise?.complete(editorPane)
    editor.editorPane = (editorPane as EditorPane) ?? null

    if (editorPane == null || editorPane.input == null) {
      return null
    }

    return {
      editor: editorPane.input,
      groupId: editorPane.group.id,
    }
  }
}

registerSingleton(IHaystackService, HaystackService, InstantiationType.Eager)
