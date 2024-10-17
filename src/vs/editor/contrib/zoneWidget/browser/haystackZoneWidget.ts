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
import { Color, RGBA } from "vs/base/common/color"
import { DisposableStore } from "vs/base/common/lifecycle"
import * as objects from "vs/base/common/objects"
import "vs/css!./zoneWidget"
import { ICodeEditor } from "vs/editor/browser/editorBrowser"
import { EditorLayoutInfo } from "vs/editor/common/config/editorOptions"
import { IPosition, Position } from "vs/editor/common/core/position"
import { IRange, Range } from "vs/editor/common/core/range"
import {
  IOptions,
  IStyles,
} from "vs/editor/contrib/zoneWidget/browser/zoneWidget"

const defaultColor = new Color(new RGBA(0, 122, 204))

const defaultOptions: IOptions = {
  showArrow: true,
  showFrame: true,
  className: "",
  frameColor: defaultColor,
  arrowColor: defaultColor,
  keepEditorSelection: false,
}

export abstract class HaystackZoneWidget {
  protected readonly _disposables = new DisposableStore()

  container: HTMLElement | null = null
  domNode: HTMLElement
  options: IOptions

  constructor(
    domElement: HTMLElement,
    protected readonly codeEditor: ICodeEditor,
    options: IOptions = {}
  ) {
    this.options = objects.deepClone(options)
    objects.mixin(this.options, defaultOptions, false)
    this.domNode = document.createElement("div")
    domElement.appendChild(this.domNode)
    if (!this.options.isAccessible) {
      this.domNode.setAttribute("aria-hidden", "true")
      this.domNode.setAttribute("role", "presentation")
    }
  }

  dispose(): void {
    this._disposables.dispose()
  }

  create(): void {
    this.domNode.classList.add("zone-widget")
    if (this.options.className) {
      this.domNode.classList.add(this.options.className)
    }

    this.container = document.createElement("div")
    this.container.classList.add("zone-widget-container")
    this.domNode.appendChild(this.container)
    this._fillContainer(this.container)
    this._applyStyles()
  }

  style(styles: IStyles): void {
    if (styles.frameColor) {
      this.options.frameColor = styles.frameColor
    }
    if (styles.arrowColor) {
      this.options.arrowColor = styles.arrowColor
    }
    this._applyStyles()
  }

  protected _applyStyles(): void {
    if (this.container && this.options.frameColor) {
      const frameColor = this.options.frameColor.toString()
      this.container.style.borderTopColor = frameColor
      this.container.style.borderBottomColor = frameColor
    }
  }

  protected _getWidth(info: EditorLayoutInfo): number {
    return info.width - info.minimap.minimapWidth - info.verticalScrollbarWidth
  }

  hasFocus() {
    return this.domNode.contains(dom.getActiveElement())
  }

  protected _isShowing: boolean = false

  show(rangeOrPos: IRange | IPosition, heightInLines: number): void {
    const range = Range.isIRange(rangeOrPos)
      ? Range.lift(rangeOrPos)
      : Range.fromPositions(rangeOrPos)
    this._isShowing = true
    this._showImpl(range, heightInLines)
    this._isShowing = false
  }

  hide(): void {}

  private _showImpl(where: Range, heightInLines: number): void {
    this.domNode.style.width = `calc(100%)`
    this.domNode.style.left = "0px"

    // Render the widget as zone (rendering) and widget (lifecycle)
    const viewZoneDomNode = document.createElement("div")
    viewZoneDomNode.style.overflow = "hidden"

    if (this.container) {
      this.container.style.width = "100%"
      this.container.style.height = "100%"
      this.container.style.overflow = "hidden"
    }

    this._doLayout(this.domNode.clientHeight, this.domNode.clientWidth)
  }

  get position(): Position | undefined {
    return undefined
  }

  protected setCssClass(className: string, classToReplace?: string): void {
    if (!this.container) {
      return
    }

    if (classToReplace) {
      this.container.classList.remove(classToReplace)
    }

    this.container.classList.add(className)
  }

  protected abstract _fillContainer(container: HTMLElement): void

  protected _onWidth(widthInPixel: number): void {
    // implement in subclass
  }

  protected _doLayout(heightInPixel: number, widthInPixel: number): void {
    // implement in subclass
  }

  protected _relayout(newHeightInLines: number): void {}
}
