/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { RendererManager } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import { isModifierKeypressed } from "vs/workbench/browser/haystack-frontend/react_utils/platform"

export function forwardWheelEventToPixi(e: WheelEvent): boolean {
  const rendererManager = RendererManager.getInstance()
  // We don't want to steal wheel events from the canvas when a scroll was initiated there or if the user is pressing the alt key.
  if (!rendererManager.isScrolling() && !isModifierKeypressed(e) && !e.altKey) {
    return false
  }

  RendererManager.getInstance().handleWheelEvent(e)
  return true
}
