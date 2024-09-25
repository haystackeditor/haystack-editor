/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from "vs/base/common/lifecycle"
import {
  AccessibilitySignal,
  IAccessibilitySignalService,
} from "vs/platform/accessibilitySignal/browser/accessibilitySignalService"
import { IWorkbenchContribution } from "vs/workbench/common/contributions"
import { SaveReason } from "vs/workbench/common/editor"
import { IWorkingCopyService } from "vs/workbench/services/workingCopy/common/workingCopyService"

export class SaveAccessibilitySignalContribution
  extends Disposable
  implements IWorkbenchContribution
{
  static readonly ID = "workbench.contrib.saveAccessibilitySignal"

  constructor(
    @IAccessibilitySignalService
    private readonly _accessibilitySignalService: IAccessibilitySignalService,
    @IWorkingCopyService
    private readonly _workingCopyService: IWorkingCopyService,
  ) {
    super()
    this._register(
      this._workingCopyService.onDidSave((e) =>
        this._accessibilitySignalService.playSignal(AccessibilitySignal.save, {
          userGesture: e.reason === SaveReason.EXPLICIT,
        }),
      ),
    )
  }
}
