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
import {
  ActionBar,
  ActionsOrientation,
  IActionBarOptions,
} from "vs/base/browser/ui/actionbar/actionbar"
import { Action } from "vs/base/common/actions"
import { Codicon } from "vs/base/common/codicons"
import { ThemeIcon } from "vs/base/common/themables"
import { Color } from "vs/base/common/color"
import { Emitter } from "vs/base/common/event"
import * as objects from "vs/base/common/objects"
import "vs/css!./media/peekViewWidget"
import * as nls from "vs/nls"
import { createActionViewItem } from "vs/platform/actions/browser/menuEntryActionViewItem"
import { IInstantiationService } from "vs/platform/instantiation/common/instantiation"
import {
  activeContrastBorder,
  contrastBorder,
  editorForeground,
  editorInfoForeground,
  registerColor,
} from "vs/platform/theme/common/colorRegistry"
import {
  IPeekViewOptions,
  IPeekViewStyles,
} from "vs/editor/contrib/peekView/browser/peekView"
import { HaystackZoneWidget } from "vs/editor/contrib/zoneWidget/browser/haystackZoneWidget"
import { ICodeEditor } from "vs/editor/browser/editorBrowser"

const defaultOptions: IPeekViewOptions = {
  headerBackgroundColor: Color.white,
  primaryHeadingColor: Color.fromHex("#333333"),
  secondaryHeadingColor: Color.fromHex("#6c6c6cb3"),
}

export abstract class HaystackPeekViewWidget extends HaystackZoneWidget {
  declare readonly _serviceBrand: undefined

  private readonly _onDidClose = new Emitter<HaystackPeekViewWidget>()
  readonly onDidClose = this._onDidClose.event
  private disposed?: true

  protected _titleElement?: HTMLDivElement
  protected _primaryHeading?: HTMLElement
  protected _secondaryHeading?: HTMLElement
  protected _metaHeading?: HTMLElement
  protected _actionbarWidget?: ActionBar
  protected _bodyElement?: HTMLDivElement

  constructor(
    domElement: HTMLElement,
    options: IPeekViewOptions,
    codeEditor: ICodeEditor,
    @IInstantiationService
    protected readonly instantiationService: IInstantiationService,
  ) {
    super(domElement, codeEditor, options)
    objects.mixin(this.options, defaultOptions, false)
  }

  override dispose(): void {
    if (!this.disposed) {
      this.disposed = true // prevent consumers who dispose on onDidClose from looping
      super.dispose()
      this._onDidClose.fire(this)
    }
  }

  override style(styles: IPeekViewStyles): void {
    const options = <IPeekViewOptions>this.options
    if (styles.headerBackgroundColor) {
      options.headerBackgroundColor = styles.headerBackgroundColor
    }
    if (styles.primaryHeadingColor) {
      options.primaryHeadingColor = styles.primaryHeadingColor
    }
    if (styles.secondaryHeadingColor) {
      options.secondaryHeadingColor = styles.secondaryHeadingColor
    }
    super.style(styles)
  }

  protected override _applyStyles(): void {
    super._applyStyles()
    const options = <IPeekViewOptions>this.options
    if (this._primaryHeading && options.primaryHeadingColor) {
      this._primaryHeading.style.color = options.primaryHeadingColor.toString()
    }
    if (this._secondaryHeading && options.secondaryHeadingColor) {
      this._secondaryHeading.style.color =
        options.secondaryHeadingColor.toString()
    }
    if (this._bodyElement && options.frameColor) {
      this._bodyElement.style.borderColor = options.frameColor.toString()
    }
  }

  protected _fillContainer(container: HTMLElement): void {
    this.setCssClass("peekview-widget")

    this._bodyElement = dom.$<HTMLDivElement>(".body")

    this._fillBody(this._bodyElement)

    container.appendChild(this._bodyElement)
  }

  protected _fillHead(container: HTMLElement, noCloseAction?: boolean): void {
    this._titleElement = dom.$(".peekview-title")
    if ((this.options as IPeekViewOptions).supportOnTitleClick) {
      this._titleElement.classList.add("clickable")
      dom.addStandardDisposableListener(this._titleElement, "click", (event) =>
        this._onTitleClick(event),
      )
    }

    this._fillTitleIcon(this._titleElement)
    this._primaryHeading = dom.$("span.filename")
    this._secondaryHeading = dom.$("span.dirname")
    this._metaHeading = dom.$("span.meta")
    dom.append(
      this._titleElement,
      this._primaryHeading,
      this._secondaryHeading,
      this._metaHeading,
    )

    const actionsContainer = dom.$(".peekview-actions")

    const actionBarOptions = this._getActionBarOptions()
    this._actionbarWidget = new ActionBar(actionsContainer, actionBarOptions)
    this._disposables.add(this._actionbarWidget)

    if (!noCloseAction) {
      this._actionbarWidget.push(
        new Action(
          "peekview.close",
          nls.localize("label.close", "Close"),
          ThemeIcon.asClassName(Codicon.close),
          true,
          () => {
            this.dispose()
            return Promise.resolve()
          },
        ),
        { label: false, icon: true },
      )
    }
  }

  protected _fillTitleIcon(container: HTMLElement): void {}

  protected _getActionBarOptions(): IActionBarOptions {
    return {
      actionViewItemProvider: createActionViewItem.bind(
        undefined,
        this.instantiationService,
      ),
      orientation: ActionsOrientation.HORIZONTAL,
    }
  }

  protected _onTitleClick(event: IMouseEvent): void {
    // implement me if supportOnTitleClick option is set
  }

  setTitle(primaryHeading: string, secondaryHeading?: string): void {
    if (this._primaryHeading && this._secondaryHeading) {
      this._primaryHeading.innerText = primaryHeading
      this._primaryHeading.setAttribute("title", primaryHeading)
      if (secondaryHeading) {
        this._secondaryHeading.innerText = secondaryHeading
      } else {
        dom.clearNode(this._secondaryHeading)
      }
    }
  }

  setMetaTitle(value: string): void {
    if (this._metaHeading) {
      if (value) {
        this._metaHeading.innerText = value
        dom.show(this._metaHeading)
      } else {
        dom.hide(this._metaHeading)
      }
    }
  }

  protected abstract _fillBody(container: HTMLElement): void

  protected override _doLayout(
    heightInPixel: number,
    widthInPixel: number,
  ): void {
    if (!this._isShowing && heightInPixel < 0) {
      // Looks like the view zone got folded away!
      this.dispose()
      return
    }

    const bodyHeight = Math.round(heightInPixel)
    this._doLayoutBody(bodyHeight, widthInPixel)
  }

  protected _doLayoutad(heightInPixel: number, widthInPixel: number): void {}

  protected _doLayoutBody(heightInPixel: number, widthInPixel: number): void {
    if (this._bodyElement) {
      this._bodyElement.style.height = `100%`
      this._bodyElement.style.width = `100%`
    }
  }
}

export const peekViewTitleBackground = registerColor(
  "peekViewTitle.background",
  {
    dark: "#252526",
    light: "#F3F3F3",
    hcDark: Color.black,
    hcLight: Color.white,
  },
  nls.localize(
    "peekViewTitleBackground",
    "Background color of the peek view title area.",
  ),
)
export const peekViewTitleForeground = registerColor(
  "peekViewTitleLabel.foreground",
  {
    dark: Color.white,
    light: Color.black,
    hcDark: Color.white,
    hcLight: editorForeground,
  },
  nls.localize("peekViewTitleForeground", "Color of the peek view title."),
)
export const peekViewTitleInfoForeground = registerColor(
  "peekViewTitleDescription.foreground",
  {
    dark: "#ccccccb3",
    light: "#616161",
    hcDark: "#FFFFFF99",
    hcLight: "#292929",
  },
  nls.localize(
    "peekViewTitleInfoForeground",
    "Color of the peek view title info.",
  ),
)
export const peekViewBorder = registerColor(
  "peekView.border",
  {
    dark: editorInfoForeground,
    light: editorInfoForeground,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
  },
  nls.localize("peekViewBorder", "Color of the peek view borders and arrow."),
)

export const peekViewResultsBackground = registerColor(
  "peekViewResult.background",
  {
    dark: "#252526",
    light: "#F3F3F3",
    hcDark: Color.black,
    hcLight: Color.white,
  },
  nls.localize(
    "peekViewResultsBackground",
    "Background color of the peek view result list.",
  ),
)
export const peekViewResultsMatchForeground = registerColor(
  "peekViewResult.lineForeground",
  {
    dark: "#bbbbbb",
    light: "#646465",
    hcDark: Color.white,
    hcLight: editorForeground,
  },
  nls.localize(
    "peekViewResultsMatchForeground",
    "Foreground color for line nodes in the peek view result list.",
  ),
)
export const peekViewResultsFileForeground = registerColor(
  "peekViewResult.fileForeground",
  {
    dark: Color.white,
    light: "#1E1E1E",
    hcDark: Color.white,
    hcLight: editorForeground,
  },
  nls.localize(
    "peekViewResultsFileForeground",
    "Foreground color for file nodes in the peek view result list.",
  ),
)
export const peekViewResultsSelectionBackground = registerColor(
  "peekViewResult.selectionBackground",
  { dark: "#3399ff33", light: "#3399ff33", hcDark: null, hcLight: null },
  nls.localize(
    "peekViewResultsSelectionBackground",
    "Background color of the selected entry in the peek view result list.",
  ),
)
export const peekViewResultsSelectionForeground = registerColor(
  "peekViewResult.selectionForeground",
  {
    dark: Color.white,
    light: "#6C6C6C",
    hcDark: Color.white,
    hcLight: editorForeground,
  },
  nls.localize(
    "peekViewResultsSelectionForeground",
    "Foreground color of the selected entry in the peek view result list.",
  ),
)
export const peekViewEditorBackground = registerColor(
  "peekViewEditor.background",
  {
    dark: "#001F33",
    light: "#F2F8FC",
    hcDark: Color.black,
    hcLight: Color.white,
  },
  nls.localize(
    "peekViewEditorBackground",
    "Background color of the peek view editor.",
  ),
)
export const peekViewEditorGutterBackground = registerColor(
  "peekViewEditorGutter.background",
  {
    dark: peekViewEditorBackground,
    light: peekViewEditorBackground,
    hcDark: peekViewEditorBackground,
    hcLight: peekViewEditorBackground,
  },
  nls.localize(
    "peekViewEditorGutterBackground",
    "Background color of the gutter in the peek view editor.",
  ),
)
export const peekViewEditorStickyScrollBackground = registerColor(
  "peekViewEditorStickyScroll.background",
  {
    dark: peekViewEditorBackground,
    light: peekViewEditorBackground,
    hcDark: peekViewEditorBackground,
    hcLight: peekViewEditorBackground,
  },
  nls.localize(
    "peekViewEditorStickScrollBackground",
    "Background color of sticky scroll in the peek view editor.",
  ),
)

export const peekViewResultsMatchHighlight = registerColor(
  "peekViewResult.matchHighlightBackground",
  { dark: "#ea5c004d", light: "#ea5c004d", hcDark: null, hcLight: null },
  nls.localize(
    "peekViewResultsMatchHighlight",
    "Match highlight color in the peek view result list.",
  ),
)
export const peekViewEditorMatchHighlight = registerColor(
  "peekViewEditor.matchHighlightBackground",
  { dark: "#ff8f0099", light: "#f5d802de", hcDark: null, hcLight: null },
  nls.localize(
    "peekViewEditorMatchHighlight",
    "Match highlight color in the peek view editor.",
  ),
)
export const peekViewEditorMatchHighlightBorder = registerColor(
  "peekViewEditor.matchHighlightBorder",
  {
    dark: null,
    light: null,
    hcDark: activeContrastBorder,
    hcLight: activeContrastBorder,
  },
  nls.localize(
    "peekViewEditorMatchHighlightBorder",
    "Match highlight border in the peek view editor.",
  ),
)
