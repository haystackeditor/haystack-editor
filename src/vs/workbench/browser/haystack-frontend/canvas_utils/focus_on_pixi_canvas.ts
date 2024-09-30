/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { getCanvasElement } from "vs/workbench/browser/haystack-frontend/root/app_common"

export function focusOnPixiCanvas() {
  const canvas = getCanvasElement()
  if (canvas == null) return
  canvas.focus()
}
