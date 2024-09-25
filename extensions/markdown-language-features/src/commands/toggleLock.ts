/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Command } from "../commandManager"
import { MarkdownPreviewManager } from "../preview/previewManager"

export class ToggleLockCommand implements Command {
  public readonly id = "markdown.preview.toggleLock"

  public constructor(
    private readonly _previewManager: MarkdownPreviewManager,
  ) {}

  public execute() {
    this._previewManager.toggleLock()
  }
}
