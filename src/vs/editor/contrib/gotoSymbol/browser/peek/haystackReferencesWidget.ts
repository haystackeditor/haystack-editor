/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from "vs/base/browser/dom"
import { IMouseEvent } from "vs/base/browser/mouseEvent"
import { Orientation } from "vs/base/browser/ui/sash/sash"
import { Sizing, SplitView } from "vs/base/browser/ui/splitview/splitview"
import { Color } from "vs/base/common/color"
import { Emitter, Event } from "vs/base/common/event"
import { FuzzyScore } from "vs/base/common/filters"
import { KeyCode } from "vs/base/common/keyCodes"
import { DisposableStore, dispose, IReference } from "vs/base/common/lifecycle"
import "vs/css!./referencesWidget"
import { ICodeEditor } from "vs/editor/browser/editorBrowser"
import { EmbeddedCodeEditorWidget } from "vs/editor/browser/widget/codeEditor/embeddedCodeEditorWidget"
import { IEditorOptions } from "vs/editor/common/config/editorOptions"
import { IRange, Range } from "vs/editor/common/core/range"
import { ScrollType } from "vs/editor/common/editorCommon"
import { TextModel } from "vs/editor/common/model/textModel"
import { ILanguageConfigurationService } from "vs/editor/common/languages/languageConfigurationRegistry"
import { PLAINTEXT_LANGUAGE_ID } from "vs/editor/common/languages/modesRegistry"
import { ILanguageService } from "vs/editor/common/languages/language"
import {
  ITextEditorModel,
  ITextModelService,
} from "vs/editor/common/services/resolverService"
import {
  AccessibilityProvider,
  DataSource,
  Delegate,
  FileReferencesRenderer,
  IdentityProvider,
  OneReferenceRenderer,
  StringRepresentationProvider,
  TreeElement,
} from "vs/editor/contrib/gotoSymbol/browser/peek/referencesTree"
import * as nls from "vs/nls"
import { IInstantiationService } from "vs/platform/instantiation/common/instantiation"
import { IKeybindingService } from "vs/platform/keybinding/common/keybinding"
import { IWorkbenchAsyncDataTreeOptions } from "vs/platform/list/browser/listService"
import {
  IColorTheme,
  IThemeService,
} from "vs/platform/theme/common/themeService"
import { IUndoRedoService } from "vs/platform/undoRedo/common/undoRedo"
import {
  FileReferences,
  OneReference,
  ReferencesModel,
} from "../referencesModel"
import {
  DecorationsManager,
  LayoutData,
  ReferencesTree,
  SelectionEvent,
} from "vs/editor/contrib/gotoSymbol/browser/peek/referencesWidget"
import { HaystackPeekViewWidget } from "vs/editor/contrib/peekView/browser/haystackPeekView"
import {
  peekViewBorder,
  peekViewResultsBackground,
  peekViewTitleBackground,
  peekViewTitleForeground,
  peekViewTitleInfoForeground,
} from "vs/editor/contrib/peekView/browser/peekView"
import { IHaystackService } from "vs/workbench/services/haystack/common/haystackService"
import { Dimension } from "vs/base/browser/dom"

/**
 * ZoneWidget that is shown as a modal
 */
export class HaystackReferenceWidget extends HaystackPeekViewWidget {
  private _model?: ReferencesModel
  private _decorationsManager?: DecorationsManager

  private readonly _disposeOnNewModel = new DisposableStore()
  private readonly _callOnDispose = new DisposableStore()

  private readonly _onDidSelectReference = new Emitter<SelectionEvent>()
  readonly onDidSelectReference = this._onDidSelectReference.event

  private _tree!: ReferencesTree
  private _treeContainer!: HTMLElement
  private _splitView!: SplitView
  private _preview!: ICodeEditor
  private _previewModelReference!: IReference<ITextEditorModel>
  private _previewNotAvailableMessage!: TextModel
  private _previewContainer!: HTMLElement
  private _dim = new dom.Dimension(0, 0)

  constructor(
    domElement: HTMLElement,
    codeEditor: ICodeEditor,
    private _defaultTreeKeyboardSupport: boolean,
    public layoutData: LayoutData,
    public readonly editorId: string,
    @IThemeService themeService: IThemeService,
    @ITextModelService
    private readonly _textModelResolverService: ITextModelService,
    @IInstantiationService
    private readonly _instantiationService: IInstantiationService,
    @IUndoRedoService private readonly _undoRedoService: IUndoRedoService,
    @IKeybindingService private readonly _keybindingService: IKeybindingService,
    @ILanguageService private readonly _languageService: ILanguageService,
    @ILanguageConfigurationService
    private readonly _languageConfigurationService: ILanguageConfigurationService,
    @IHaystackService private readonly haystackService: IHaystackService,
  ) {
    super(
      domElement,
      {
        showFrame: false,
        showArrow: true,
        isResizeable: true,
        isAccessible: true,
        supportOnTitleClick: true,
      },
      codeEditor,
      _instantiationService,
    )

    this._applyTheme(themeService.getColorTheme())
    this._callOnDispose.add(
      themeService.onDidColorThemeChange(this._applyTheme.bind(this)),
    )
    this.create()
  }

  public layout(width: number, height: number): void {
    this._dim = new Dimension(width, height)
    this._tree.layout(height)
    this._splitView.layout(width)
  }

  override dispose(): void {
    this.setModel(undefined)
    this._callOnDispose.dispose()
    this._disposeOnNewModel.dispose()
    dispose(this._preview)
    dispose(this._previewNotAvailableMessage)
    dispose(this._tree)
    dispose(this._previewModelReference)
    this._splitView.dispose()
    super.dispose()
  }

  private _applyTheme(theme: IColorTheme) {
    const borderColor = theme.getColor(peekViewBorder) || Color.transparent
    this.style({
      arrowColor: borderColor,
      frameColor: borderColor,
      headerBackgroundColor:
        theme.getColor(peekViewTitleBackground) || Color.transparent,
      primaryHeadingColor: theme.getColor(peekViewTitleForeground),
      secondaryHeadingColor: theme.getColor(peekViewTitleInfoForeground),
    })
  }

  override show(where: IRange) {
    super.show(where, this.layoutData.heightInLines || 18)
  }

  focusOnReferenceTree(): void {
    this._tree.domFocus()
  }

  focusOnPreviewEditor(): void {
    this._preview.focus()
  }

  isPreviewEditorFocused(): boolean {
    return this._preview.hasTextFocus()
  }

  protected override _onTitleClick(e: IMouseEvent): void {
    if (this._preview && this._preview.getModel()) {
      this._onDidSelectReference.fire({
        element: this._getFocusedReference(),
        kind: e.ctrlKey || e.metaKey || e.altKey ? "side" : "open",
        source: "title",
      })
    }
  }

  protected _fillBody(containerElement: HTMLElement): void {
    this.setCssClass("reference-zone-widget")

    this._splitView = new SplitView(containerElement, {
      orientation: Orientation.HORIZONTAL,
    })

    // editor
    this._previewContainer = dom.append(
      containerElement,
      dom.$("div.preview.inline"),
    )
    this._previewContainer.style.height = "100%"
    const options: IEditorOptions = {
      scrollBeyondLastLine: false,
      scrollbar: {
        verticalScrollbarSize: 14,
        horizontal: "auto",
        useShadows: true,
        verticalHasArrows: false,
        horizontalHasArrows: false,
        alwaysConsumeMouseWheel: true,
      },
      overviewRulerLanes: 2,
      fixedOverflowWidgets: true,
      minimap: {
        enabled: false,
      },
    }
    this._preview = this._instantiationService.createInstance(
      EmbeddedCodeEditorWidget,
      this._previewContainer,
      options,
      {},
      this.codeEditor,
    )
    dom.hide(this._previewContainer)
    this._previewNotAvailableMessage = new TextModel(
      nls.localize("missingPreviewMessage", "no preview available"),
      PLAINTEXT_LANGUAGE_ID,
      TextModel.DEFAULT_CREATION_OPTIONS,
      null,
      this._undoRedoService,
      this._languageService,
      this._languageConfigurationService,
    )

    // tree
    this._treeContainer = dom.append(
      containerElement,
      dom.$("div.ref-tree.inline"),
    )
    const treeOptions: IWorkbenchAsyncDataTreeOptions<TreeElement, FuzzyScore> =
    {
      keyboardSupport: this._defaultTreeKeyboardSupport,
      accessibilityProvider: new AccessibilityProvider(),
      keyboardNavigationLabelProvider:
        this._instantiationService.createInstance(
          StringRepresentationProvider,
        ),
      identityProvider: new IdentityProvider(),
      openOnSingleClick: true,
      selectionNavigation: true,
      overrideStyles: {
        listBackground: peekViewResultsBackground,
      },
    }
    if (this._defaultTreeKeyboardSupport) {
      // the tree will consume `Escape` and prevent the widget from closing
      this._callOnDispose.add(
        dom.addStandardDisposableListener(
          this._treeContainer,
          "keydown",
          (e) => {
            if (e.equals(KeyCode.Escape)) {
              this._keybindingService.dispatchEvent(e, e.target)
            }
          },
          true,
        ),
      )
    }
    this._tree = this._instantiationService.createInstance(
      ReferencesTree,
      "ReferencesWidget",
      this._treeContainer,
      new Delegate(),
      [
        this._instantiationService.createInstance(FileReferencesRenderer),
        this._instantiationService.createInstance(OneReferenceRenderer),
      ],
      this._instantiationService.createInstance(DataSource),
      treeOptions,
    )

    // split stuff
    this._splitView.addView(
      {
        onDidChange: Event.None,
        element: this._previewContainer,
        minimumSize: 200,
        maximumSize: Number.MAX_VALUE,
        layout: (width) => {
          this._preview.layout({ height: this._dim.height, width })
        },
      },
      Sizing.Distribute,
    )

    this._splitView.addView(
      {
        onDidChange: Event.None,
        element: this._treeContainer,
        minimumSize: 100,
        maximumSize: Number.MAX_VALUE,
        layout: (width) => {
          this._treeContainer.style.height = `${this._dim.height}px`
          this._treeContainer.style.width = `${width}px`
          this._tree.layout(this._dim.height, width)
        },
      },
      Sizing.Distribute,
    )

    this._disposables.add(
      this._splitView.onDidSashChange(() => {
        if (this._dim.width) {
          this.layoutData.ratio =
            this._splitView.getViewSize(0) / this._dim.width
        }
      }, undefined),
    )

    // listen on selection and focus
    const onEvent = (
      element: any,
      kind: "show" | "goto" | "side" | "gotoSide",
    ) => {
      if (element instanceof OneReference) {
        if (kind === "show") {
          this._revealReference(element, false)
          this.haystackService.setCurrentReference(this.editorId, element.uri)
        } else if (kind == "goto") {
          this.haystackService.deleteEditor(this.editorId)
        }
        this._onDidSelectReference.fire({ element, kind, source: "tree" })
      }
    }

    this._tree.onDidOpen((e) => {
      if (e.sideBySide) {
        onEvent(e.element, "side")
      } else if (e.editorOptions.pinned) {
        if (
          (dom.isKeyboardEvent(e.browserEvent) ||
            dom.isMouseEvent(e.browserEvent)) &&
          e.browserEvent.shiftKey
        ) {
          onEvent(e.element, "gotoSide")
        } else {
          onEvent(e.element, "goto")
        }
      } else {
        onEvent(e.element, "show")
      }
    })

    dom.hide(this._treeContainer)
  }

  protected override _onWidth(width: number) {
    if (this._dim) {
      this._doLayoutBody(this._dim.height, width)
    }
  }

  protected override _doLayoutBody(
    heightInPixel: number,
    widthInPixel: number,
  ): void {
    super._doLayoutBody(heightInPixel, widthInPixel)
    this._dim = new dom.Dimension(widthInPixel, heightInPixel)
    this.layoutData.heightInLines = this.layoutData.heightInLines
    this._splitView.layout(widthInPixel)
    this._splitView.resizeView(0, widthInPixel * this.layoutData.ratio)
  }

  setSelection(selection: OneReference): Promise<any> {
    return this._revealReference(selection, true).then(() => {
      if (!this._model) {
        // disposed
        return
      }
      // show in tree
      this._tree.setSelection([selection])
      this._tree.setFocus([selection])
    })
  }

  setModel(newModel: ReferencesModel | undefined): Promise<any> {
    // clean up
    this._disposeOnNewModel.clear()
    this._model = newModel
    if (this._model) {
      return this._onNewModel()
    }
    return Promise.resolve()
  }

  private _onNewModel(): Promise<any> {
    if (!this._model) {
      return Promise.resolve(undefined)
    }

    if (this._model.isEmpty) {
      return Promise.resolve(undefined)
    }

    this._decorationsManager = new DecorationsManager(
      this._preview,
      this._model,
    )
    this._disposeOnNewModel.add(this._decorationsManager)

    // listen on model changes
    this._disposeOnNewModel.add(
      this._model.onDidChangeReferenceRange((reference) =>
        this._tree.rerender(reference),
      ),
    )

    // listen on editor
    this._disposeOnNewModel.add(
      this._preview.onMouseDown((e) => {
        const { event, target } = e
        if (event.detail !== 2) {
          return
        }
        const element = this._getFocusedReference()
        if (!element) {
          return
        }
        this._onDidSelectReference.fire({
          element: { uri: element.uri, range: target.range! },
          kind:
            event.ctrlKey || event.metaKey || event.altKey ? "side" : "open",
          source: "editor",
        })
      }),
    )

    // make sure things are rendered
    this.container!.classList.add("results-loaded")
    dom.show(this._treeContainer)
    dom.show(this._previewContainer)
    this._splitView.layout(this._dim.width)
    this.focusOnReferenceTree()

    // pick input and a reference to begin with
    return this._tree.setInput(
      this._model.groups.length === 1 ? this._model.groups[0] : this._model,
    )
  }

  private _getFocusedReference(): OneReference | undefined {
    const [element] = this._tree.getFocus()
    if (element instanceof OneReference) {
      return element
    } else if (element instanceof FileReferences) {
      if (element.children.length > 0) {
        return element.children[0]
      }
    }
    return undefined
  }

  async revealReference(reference: OneReference): Promise<void> {
    await this._revealReference(reference, false)
    this._onDidSelectReference.fire({
      element: reference,
      kind: "goto",
      source: "tree",
    })
  }

  private _revealedReference?: OneReference

  private async _revealReference(
    reference: OneReference,
    revealParent: boolean,
  ): Promise<void> {
    // check if there is anything to do...
    if (this._revealedReference === reference) {
      return
    }
    this._revealedReference = reference

    const promise = this._textModelResolverService.createModelReference(
      reference.uri,
    )

    if (this._tree.getInput() === reference.parent) {
      this._tree.reveal(reference)
    } else {
      if (revealParent) {
        this._tree.reveal(reference.parent)
      }
      await this._tree.expand(reference.parent)
      this._tree.reveal(reference)
    }

    const ref = await promise

    if (!this._model) {
      // disposed
      ref.dispose()
      return
    }

    dispose(this._previewModelReference)

    // show in editor
    const model = ref.object
    if (model) {
      const scrollType =
        this._preview.getModel() === model.textEditorModel
          ? ScrollType.Smooth
          : ScrollType.Immediate
      const sel = Range.lift(reference.range).collapseToStart()
      this._previewModelReference = ref
      this._preview.setModel(model.textEditorModel)
      this._preview.setSelection(sel)
      this._preview.revealRangeInCenter(sel, scrollType)
    } else {
      this._preview.setModel(this._previewNotAvailableMessage)
      ref.dispose()
    }
  }
}
