/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from "vs/nls"
import { Disposable, DisposableStore } from "vs/base/common/lifecycle"
import { KeybindingLabel } from "vs/base/browser/ui/keybindingLabel/keybindingLabel"
import {
  editorForeground,
  registerColor,
  transparent,
} from "vs/platform/theme/common/colorRegistry"

registerColor(
  "editorWatermark.foreground",
  {
    dark: transparent(editorForeground, 0.6),
    light: transparent(editorForeground, 0.68),
    hcDark: editorForeground,
    hcLight: editorForeground,
  },
  localize(
    "editorLineHighlight",
    "Foreground color for the labels in the editor watermark.",
  ),
)

export class EditorGroupWatermark extends Disposable {
  private readonly transientDisposables = this._register(new DisposableStore())
  private keybindingLabels = new Set<KeybindingLabel>()

  constructor(container: HTMLElement) {
    super()

    this.render()
  }

  private render(): void {}

  private clear(): void {
    this.transientDisposables.clear()
  }

  override dispose(): void {
    super.dispose()
    this.clear()
    this.keybindingLabels.forEach((label) => label.dispose())
  }
}
