/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { extHostNamedCustomer } from "vs/workbench/services/extensions/common/extHostCustomers"
import {
  MainContext,
  MainThreadClipboardShape,
} from "../common/extHost.protocol"
import { IClipboardService } from "vs/platform/clipboard/common/clipboardService"

@extHostNamedCustomer(MainContext.MainThreadClipboard)
export class MainThreadClipboard implements MainThreadClipboardShape {
  constructor(
    _context: any,
    @IClipboardService private readonly _clipboardService: IClipboardService,
  ) {}

  dispose(): void {
    // nothing
  }

  $readText(): Promise<string> {
    return this._clipboardService.readText()
  }

  $writeText(value: string): Promise<void> {
    return this._clipboardService.writeText(value)
  }
}
