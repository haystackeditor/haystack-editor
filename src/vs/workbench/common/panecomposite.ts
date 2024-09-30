/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IView, IViewPaneContainer } from "vs/workbench/common/views"
import { IComposite } from "vs/workbench/common/composite"

export interface IPaneComposite extends IComposite {
  /**
   * Returns the minimal width needed to avoid any content horizontal truncation
   */
  getOptimalWidth(): number | undefined

  openView<T extends IView>(id: string, focus?: boolean): T | undefined
  getViewPaneContainer(): IViewPaneContainer | undefined
}
