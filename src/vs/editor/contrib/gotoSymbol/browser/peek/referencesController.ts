/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancelablePromise } from "vs/base/common/async"
import { KeyChord, KeyCode, KeyMod } from "vs/base/common/keyCodes"
import { DisposableStore } from "vs/base/common/lifecycle"
import { ICodeEditor } from "vs/editor/browser/editorBrowser"
import { EditorOption } from "vs/editor/common/config/editorOptions"
import { Position } from "vs/editor/common/core/position"
import { IRange, Range } from "vs/editor/common/core/range"
import { IEditorContribution } from "vs/editor/common/editorCommon"
import { DocumentSymbol, Location } from "vs/editor/common/languages"
import {
  getOuterEditor,
  PeekContext,
} from "vs/editor/contrib/peekView/browser/peekView"
import * as nls from "vs/nls"
import { CommandsRegistry } from "vs/platform/commands/common/commands"
import {
  ContextKeyExpr,
  IContextKey,
  IContextKeyService,
  RawContextKey,
} from "vs/platform/contextkey/common/contextkey"
import {
  IInstantiationService,
  ServicesAccessor,
} from "vs/platform/instantiation/common/instantiation"
import {
  KeybindingsRegistry,
  KeybindingWeight,
} from "vs/platform/keybinding/common/keybindingsRegistry"
import {
  IListService,
  WorkbenchListFocusContextKey,
  WorkbenchTreeElementCanCollapse,
  WorkbenchTreeElementCanExpand,
} from "vs/platform/list/browser/listService"
import {
  IStorageService,
  StorageScope,
  StorageTarget,
} from "vs/platform/storage/common/storage"
import { OneReference, ReferencesModel } from "../referencesModel"
import { LayoutData } from "./referencesWidget"
import { IHaystackService } from "vs/workbench/services/haystack/common/haystackService"
import { ILanguageService } from "vs/editor/common/languages/language"
import { ILanguageFeaturesService } from "vs/editor/common/services/languageFeatures"
import { CancellationTokenSource } from "vs/base/common/cancellation"
import { isValidSymbol } from "vs/base/haystack/is_valid_symbol"
import { HaystackReferenceWidget } from "vs/editor/contrib/gotoSymbol/browser/peek/haystackReferencesWidget"
import { EditorContextKeys } from "vs/editor/common/editorContextKeys"
import { InputFocusedContext } from "vs/platform/contextkey/common/contextkeys"

export const ctxReferenceSearchVisible = new RawContextKey<boolean>(
  "referenceSearchVisible",
  false,
  nls.localize(
    "referenceSearchVisible",
    "Whether reference peek is visible, like 'Peek References' or 'Peek Definition'",
  ),
)

export abstract class ReferencesController implements IEditorContribution {
  static readonly ID = "editor.contrib.referencesController"

  private readonly _disposables = new DisposableStore()

  private _widget?: HaystackReferenceWidget
  private _model?: ReferencesModel
  private _requestIdPool = 0
  private _ignoreModelChangeEvent = false

  private readonly _referenceSearchVisible: IContextKey<boolean>

  static get(editor: ICodeEditor): ReferencesController | null {
    return editor.getContribution<ReferencesController>(ReferencesController.ID)
  }

  constructor(
    private readonly _defaultTreeKeyboardSupport: boolean,
    private readonly _editor: ICodeEditor,
    @IContextKeyService contextKeyService: IContextKeyService,
    @IHaystackService private readonly _haystackService: IHaystackService,
    @ILanguageService private readonly _languageService: ILanguageService,
    @ILanguageFeaturesService
    readonly _languageFeatureService: ILanguageFeaturesService,
    @IInstantiationService
    private readonly _instantiationService: IInstantiationService,
    @IStorageService private readonly _storageService: IStorageService,
  ) {
    this._referenceSearchVisible =
      ctxReferenceSearchVisible.bindTo(contextKeyService)
  }

  dispose(): void {
    this._referenceSearchVisible.reset()
    this._disposables.dispose()
    this._widget?.dispose()
    this._model?.dispose()
    this._widget = undefined
    this._model = undefined
  }

  toggleWidget(
    domElement: HTMLElement,
    modelPromise: CancelablePromise<ReferencesModel>,
    range: IRange,
    peekMode: boolean,
    editorId: string,
  ): HaystackReferenceWidget {
    // close current widget and return early is position didn't change
    let widgetPosition: Position | undefined
    this.closeWidget()
    if (
      !!widgetPosition &&
      range &&
      Range.containsPosition(range, widgetPosition)
    ) {
      return this._widget!
    }

    this._referenceSearchVisible.set(true)

    // close the widget on model/mode changes
    this._disposables.add(
      this._editor.onDidChangeModelLanguage(() => {
        this.closeWidget()
      }),
    )
    this._disposables.add(
      this._editor.onDidChangeModel(() => {
        if (!this._ignoreModelChangeEvent) {
          this.closeWidget()
        }
      }),
    )
    const storageKey = "peekViewLayout"
    const data = LayoutData.fromJSON(
      this._storageService.get(storageKey, StorageScope.PROFILE, "{}"),
    )

    this._widget = this._instantiationService.createInstance(
      HaystackReferenceWidget,
      domElement,
      this._editor,
      this._defaultTreeKeyboardSupport,
      data,
      editorId,
    )

    this._widget.setTitle(nls.localize("labelLoading", "Loading..."))

    this._widget.show(range)

    this._disposables.add(
      this._widget.onDidClose(() => {
        modelPromise.cancel()
        if (this._widget) {
          this._storageService.store(
            storageKey,
            JSON.stringify(this._widget.layoutData),
            StorageScope.PROFILE,
            StorageTarget.MACHINE,
          )
          this._widget = undefined
        }
        this.closeWidget()
      }),
    )

    this._disposables.add(
      this._widget.onDidSelectReference((event) => {
        const { element, kind } = event
        if (!element) {
          return
        }
        switch (kind) {
          case "open":
            // when stable peek is configured we don't close
            // the peek window on selecting the editor
            this.openReference(element, false, false)
            break
          case "side":
            this.openReference(element, true, false)
            break
          case "gotoSide":
            this._gotoReference(element, true)
            break
          case "goto":
            if (peekMode) {
              this._gotoReference(element, false)
            } else {
              this.openReference(element, false, true)
            }
            break
        }
      }),
    )

    const requestId = ++this._requestIdPool

    modelPromise.then((model) => {
      // still current request? widget still open?
      if (requestId !== this._requestIdPool || !this._widget) {
        model.dispose()
        return undefined
      }

      this._model?.dispose()
      this._model = model

      // show widget
      return this._widget.setModel(this._model).then(() => {
        if (this._widget && this._model && this._editor.hasModel()) {
          // might have been closed

          // set title
          if (!this._model.isEmpty) {
            this._widget.setMetaTitle(
              nls.localize(
                "metaTitle.N",
                "{0} ({1})",
                this._model.title,
                this._model.references.length,
              ),
            )

            const firstReference = this._model.firstReference()
            if (firstReference != null) {
              this._haystackService.setCurrentReference(
                editorId,
                firstReference.uri,
                this._model.references.length,
              )
            }
          } else {
            this._widget.setMetaTitle("")
          }

          // set 'best' selection
          const uri = this._editor.getModel().uri
          const pos = new Position(range.startLineNumber, range.startColumn)
          const selection = this._model.nearestReference(uri, pos)
          if (selection) {
            this._widget.setSelection(selection).then(() => {
              if (
                this._widget &&
                this._editor.getOption(EditorOption.peekWidgetDefaultFocus) ===
                "editor"
              ) {
                this._widget.focusOnPreviewEditor()
              }
            })
          }
        }
      })
    })
    return this._widget
  }

  changeFocusBetweenPreviewAndReferences() {
    if (!this._widget) {
      // can be called while still resolving...
      return
    }
    if (this._widget.isPreviewEditorFocused()) {
      this._widget.focusOnReferenceTree()
    } else {
      this._widget.focusOnPreviewEditor()
    }
  }

  async goToNextOrPreviousReference(fwd: boolean) {
    if (!this._editor.hasModel() || !this._model || !this._widget) {
      // can be called while still resolving...
      return
    }
    const currentPosition = this._widget.position
    if (!currentPosition) {
      return
    }
    const source = this._model.nearestReference(
      this._editor.getModel().uri,
      currentPosition,
    )
    if (!source) {
      return
    }
    const target = this._model.nextOrPreviousReference(source, fwd)
    const editorFocus = this._editor.hasTextFocus()
    const previewEditorFocus = this._widget.isPreviewEditorFocused()
    await this._widget.setSelection(target)
    await this._gotoReference(target, false)
    if (editorFocus) {
      this._editor.focus()
    } else if (this._widget && previewEditorFocus) {
      this._widget.focusOnPreviewEditor()
    }
  }

  async revealReference(
    reference: OneReference,
    openWithoutClosing: boolean,
  ): Promise<void> {
    if (!this._editor.hasModel() || !this._model || !this._widget) {
      // can be called while still resolving...
      return
    }

    await this._gotoReference(reference, openWithoutClosing)
  }

  closeWidget(focusEditor = true): void {
    if (this._widget?.editorId != null) {
      this._haystackService.deleteEditor(this._widget.editorId)
    }
    this._widget?.dispose()
    this._model?.dispose()
    this._referenceSearchVisible.reset()
    this._disposables.clear()
    this._widget = undefined
    this._model = undefined
    if (focusEditor) {
      this._editor.focus()
    }
    this._requestIdPool += 1 // Cancel pending requests
  }

  private async _gotoReference(
    ref: Location,
    openWithoutClosing: boolean,
  ): Promise<any> {
    if (this._widget?.editorId && !openWithoutClosing) {
      this._haystackService.deleteEditor(this._widget.editorId)
    }

    this._widget?.hide()

    this._ignoreModelChangeEvent = true
    const range = Range.lift(ref.range).collapseToStart()

    const languageId =
      this._languageService.guessLanguageIdByFilepathOrFirstLine(ref.uri)
    if (languageId == null) return

    const providers =
      this._languageFeatureService.documentSymbolProvider.orderedWithoutModel(
        ref.uri,
        languageId,
      )
    const documentSymbols: DocumentSymbol[] = []

    for (const provider of providers) {
      const source = new CancellationTokenSource()
      const symbols = await provider.provideDocumentSymbolsWithoutModel(
        ref.uri,
        source.token,
      )
      if (symbols == null) continue
      documentSymbols.push(...symbols)
    }

    let symbol: DocumentSymbol | null = null
    for (const documentSymbol of documentSymbols) {
      if (
        documentSymbol.selectionRange.startLineNumber ===
        range.startLineNumber &&
        documentSymbol.selectionRange.endLineNumber === range.endLineNumber &&
        documentSymbol.selectionRange.startColumn === range.startColumn &&
        documentSymbol.selectionRange.endColumn === range.endColumn
      ) {
        symbol = documentSymbol
        break
      }
    }

    if (symbol == null || !isValidSymbol(symbol)) {
      const model = this._editor.getModel()
      const editRange = this._editor.getEditRange()
      if (
        model &&
        ref.uri.toString() === model.uri.toString() &&
        (editRange == null || Range.containsRange(editRange, range))
      ) {
        this._editor.revealRangeNearTopIfOutsideViewport(range)
        this._editor.setSelection({
          startLineNumber: range.startLineNumber,
          startColumn: range.startColumn,
          endLineNumber: range.startLineNumber,
          endColumn: range.startColumn,
        })
        const modelNow = this._editor.getModel()
        const decorations = this._editor.createDecorationsCollection([
          {
            range,
            options: {
              description: "symbol-navigate-action-highlight",
              className: "symbolHighlight",
            },
          },
        ])

        setTimeout(() => {
          if (this._editor.getModel() === modelNow) {
            decorations.clear()
          }
        }, 350)
        return undefined
      } else {
        await this._haystackService.createFileEditor(
          ref.uri,
          {
            selectionRange: {
              startLineNumber: range.startLineNumber,
              startColumn: range.startColumn,
              endLineNumber: range.startLineNumber,
              endColumn: range.startColumn,
            },
            highlightRange: range,
            doNotPanTo: openWithoutClosing,
          },
          { preserveFocus: openWithoutClosing },
        )
      }
    } else {
      await this._haystackService.createSymbolEditorWithSymbol(
        symbol.name,
        symbol.kind,
        ref.uri,
        symbol.range,
        {
          highlightRange: range,
          doNotPanTo: openWithoutClosing,
        },
        { preserveFocus: openWithoutClosing },
      )
    }
  }

  async openReference(
    ref: Location,
    sideBySide: boolean,
    pinned: boolean,
  ): Promise<void> {
    this.closeWidget()
    const { range, uri } = ref

    const languageId =
      this._languageService.guessLanguageIdByFilepathOrFirstLine(uri)
    if (languageId == null) return

    const providers =
      this._languageFeatureService.documentSymbolProvider.orderedWithoutModel(
        uri,
        languageId,
      )
    const documentSymbols: DocumentSymbol[] = []

    for (const provider of providers) {
      const source = new CancellationTokenSource()
      const symbols = await provider.provideDocumentSymbolsWithoutModel(
        uri,
        source.token,
      )
      if (symbols == null) continue
      documentSymbols.push(...symbols)
    }

    let symbol: DocumentSymbol | null = null
    for (const documentSymbol of documentSymbols) {
      if (
        documentSymbol.selectionRange.startLineNumber ===
        range.startLineNumber &&
        documentSymbol.selectionRange.endLineNumber === range.endLineNumber &&
        documentSymbol.selectionRange.startColumn === range.startColumn &&
        documentSymbol.selectionRange.endColumn === range.endColumn
      ) {
        symbol = documentSymbol
        break
      }
    }

    if (symbol == null) {
      const model = this._editor.getModel()
      const editRange = this._editor.getEditRange()
      if (
        model &&
        uri.toString() === model.uri.toString() &&
        (editRange == null || Range.containsRange(editRange, range))
      ) {
        this._editor.revealRangeNearTopIfOutsideViewport(range)
        this._editor.setSelection({
          startLineNumber: range.startLineNumber,
          startColumn: range.startColumn,
          endLineNumber: range.startLineNumber,
          endColumn: range.startColumn,
        })
        const modelNow = this._editor.getModel()
        const decorations = this._editor.createDecorationsCollection([
          {
            range,
            options: {
              description: "symbol-navigate-action-highlight",
              className: "symbolHighlight",
            },
          },
        ])

        setTimeout(() => {
          if (this._editor.getModel() === modelNow) {
            decorations.clear()
          }
        }, 350)
      } else {
        await this._haystackService.createFileEditor(uri, {
          selectionRange: {
            startLineNumber: range.startLineNumber,
            startColumn: range.startColumn,
            endLineNumber: range.startLineNumber,
            endColumn: range.startColumn,
          },
          highlightRange: range,
        })
      }
    } else {
      await this._haystackService.createSymbolEditorWithSymbol(
        symbol.name,
        symbol.kind,
        uri,
        symbol.range,
        {
          highlightRange: range,
        },
      )
    }
  }
}

function withController(
  accessor: ServicesAccessor,
  fn: (controller: ReferencesController) => void,
): void {
  const outerEditor = getOuterEditor(accessor)
  if (!outerEditor) {
    return
  }
  const controller = ReferencesController.get(outerEditor)
  if (controller) {
    fn(controller)
  }
}

KeybindingsRegistry.registerCommandAndKeybindingRule({
  id: "togglePeekWidgetFocus",
  weight: KeybindingWeight.EditorContrib,
  primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyCode.F2),
  when: ContextKeyExpr.or(ctxReferenceSearchVisible, PeekContext.inPeekEditor),
  handler(accessor) {
    withController(accessor, (controller) => {
      controller.changeFocusBetweenPreviewAndReferences()
    })
  },
})

KeybindingsRegistry.registerCommandAndKeybindingRule({
  id: "goToNextReference",
  weight: KeybindingWeight.EditorContrib - 10,
  primary: KeyCode.F4,
  secondary: [KeyCode.F12],
  when: ContextKeyExpr.or(ctxReferenceSearchVisible, PeekContext.inPeekEditor),
  handler(accessor) {
    withController(accessor, (controller) => {
      controller.goToNextOrPreviousReference(true)
    })
  },
})

KeybindingsRegistry.registerCommandAndKeybindingRule({
  id: "goToPreviousReference",
  weight: KeybindingWeight.EditorContrib - 10,
  primary: KeyMod.Shift | KeyCode.F4,
  secondary: [KeyMod.Shift | KeyCode.F12],
  when: ContextKeyExpr.or(ctxReferenceSearchVisible, PeekContext.inPeekEditor),
  handler(accessor) {
    withController(accessor, (controller) => {
      controller.goToNextOrPreviousReference(false)
    })
  },
})

// commands that aren't needed anymore because there is now ContextKeyExpr.OR
CommandsRegistry.registerCommandAlias(
  "goToNextReferenceFromEmbeddedEditor",
  "goToNextReference",
)
CommandsRegistry.registerCommandAlias(
  "goToPreviousReferenceFromEmbeddedEditor",
  "goToPreviousReference",
)

// close
CommandsRegistry.registerCommandAlias(
  "closeReferenceSearchEditor",
  "closeReferenceSearch",
)
CommandsRegistry.registerCommand("closeReferenceSearch", (accessor) =>
  withController(accessor, (controller) => controller.closeWidget()),
)
KeybindingsRegistry.registerKeybindingRule({
  id: "closeReferenceSearch",
  weight: KeybindingWeight.EditorContrib - 101,
  primary: KeyCode.Escape,
  secondary: [KeyMod.Shift | KeyCode.Escape],
  when: ContextKeyExpr.and(
    PeekContext.inPeekEditor,
    ContextKeyExpr.not("config.editor.stablePeek"),
  ),
})
KeybindingsRegistry.registerKeybindingRule({
  id: "closeReferenceSearch",
  weight: KeybindingWeight.WorkbenchContrib + 50,
  primary: KeyCode.Escape,
  secondary: [KeyMod.Shift | KeyCode.Escape],
  when: ContextKeyExpr.and(
    ctxReferenceSearchVisible,
    ContextKeyExpr.not("config.editor.stablePeek"),
    ContextKeyExpr.or(
      EditorContextKeys.editorTextFocus,
      InputFocusedContext.negate(),
    ),
  ),
})

KeybindingsRegistry.registerCommandAndKeybindingRule({
  id: "revealReference",
  weight: KeybindingWeight.WorkbenchContrib,
  primary: KeyCode.Enter,
  mac: {
    primary: KeyCode.Enter,
    secondary: [KeyMod.CtrlCmd | KeyCode.DownArrow],
  },
  when: ContextKeyExpr.and(
    ctxReferenceSearchVisible,
    WorkbenchListFocusContextKey,
    WorkbenchTreeElementCanCollapse.negate(),
    WorkbenchTreeElementCanExpand.negate(),
  ),
  handler(accessor: ServicesAccessor) {
    const listService = accessor.get(IListService)

    const focus = <any[]>listService.lastFocusedList?.getFocus()
    if (Array.isArray(focus) && focus[0] instanceof OneReference) {
      withController(accessor, (controller) =>
        controller.revealReference(focus[0], false),
      )
    }
  },
})

KeybindingsRegistry.registerCommandAndKeybindingRule({
  id: "revealReferenceWithoutClosing",
  weight: KeybindingWeight.WorkbenchContrib,
  primary: KeyCode.Enter | KeyMod.Shift,
  mac: {
    primary: KeyCode.Enter | KeyMod.Shift,
    secondary: [KeyMod.CtrlCmd | KeyCode.DownArrow | KeyMod.Shift],
  },
  when: ContextKeyExpr.and(
    ctxReferenceSearchVisible,
    WorkbenchListFocusContextKey,
    WorkbenchTreeElementCanCollapse.negate(),
    WorkbenchTreeElementCanExpand.negate(),
  ),
  handler(accessor: ServicesAccessor) {
    const listService = accessor.get(IListService)

    const focus = <any[]>listService.lastFocusedList?.getFocus()
    if (Array.isArray(focus) && focus[0] instanceof OneReference) {
      withController(accessor, (controller) =>
        controller.revealReference(focus[0], true),
      )
    }
  },
})

KeybindingsRegistry.registerCommandAndKeybindingRule({
  id: "openReferenceToSide",
  weight: KeybindingWeight.EditorContrib,
  primary: KeyMod.CtrlCmd | KeyCode.Enter,
  mac: {
    primary: KeyMod.WinCtrl | KeyCode.Enter,
  },
  when: ContextKeyExpr.and(
    ctxReferenceSearchVisible,
    WorkbenchListFocusContextKey,
    WorkbenchTreeElementCanCollapse.negate(),
    WorkbenchTreeElementCanExpand.negate(),
  ),
  handler(accessor: ServicesAccessor) {
    const listService = accessor.get(IListService)
    const focus = <any[]>listService.lastFocusedList?.getFocus()
    if (Array.isArray(focus) && focus[0] instanceof OneReference) {
      withController(accessor, (controller) =>
        controller.openReference(focus[0], true, true),
      )
    }
  },
})

CommandsRegistry.registerCommand("openReference", (accessor) => {
  const listService = accessor.get(IListService)
  const focus = <any[]>listService.lastFocusedList?.getFocus()
  if (Array.isArray(focus) && focus[0] instanceof OneReference) {
    withController(accessor, (controller) =>
      controller.openReference(focus[0], false, true),
    )
  }
})
