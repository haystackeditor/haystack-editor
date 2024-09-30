/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode } from "vs/workbench/browser/haystack-frontend/canvas/keyboard_constants"
import { RendererManager } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import { isModifierKeypressed } from "vs/workbench/browser/haystack-frontend/react_utils/platform"

export function shouldForwardInputToPixi(e: React.KeyboardEvent): boolean {
  switch (e.code) {
    case KeyCode.DELETE:
    case KeyCode.BACKSPACE:
      return true
    default:
      return false
  }
}

// Should always be sent to Pixi for handling.
export function informPixiOfKeyboardEvents(e: React.KeyboardEvent) {
  switch (e.code) {
    case KeyCode.ALT_LEFT:
      RendererManager.getInstance().forwardKeyboardInputToPixi(e.nativeEvent)
      return
    case KeyCode.CTRL_LEFT:
    case KeyCode.CTRL_RIGHT:
    case KeyCode.META_LEFT:
    case KeyCode.META_RIGHT:
      if (isModifierKeypressed(e.nativeEvent)) {
        RendererManager.getInstance().forwardKeyboardInputToPixi(e.nativeEvent)
      }
      return
    case KeyCode.ONE:
    case KeyCode.TWO:
    case KeyCode.THREE:
    case KeyCode.FOUR:
    case KeyCode.FIVE:
    case KeyCode.SIX:
    case KeyCode.SEVEN:
    case KeyCode.EIGHT:
    case KeyCode.NINE:
      if (isModifierKeypressed(e.nativeEvent)) {
        RendererManager.getInstance().forwardKeyboardInputToPixi(e.nativeEvent)
      }
      break
  }
}

// Should always be sent to Pixi for handling.
export function informPixiOfKeyboardEventsNative(e: KeyboardEvent) {
  switch (e.code) {
    case KeyCode.ALT_LEFT:
      RendererManager.getInstance().forwardKeyboardInputToPixi(e)
      return
    case KeyCode.CTRL_LEFT:
    case KeyCode.CTRL_RIGHT:
    case KeyCode.META_LEFT:
    case KeyCode.META_RIGHT:
      RendererManager.getInstance().forwardKeyboardInputToPixi(e)
      return
    case KeyCode.ONE:
    case KeyCode.TWO:
    case KeyCode.THREE:
    case KeyCode.FOUR:
    case KeyCode.FIVE:
    case KeyCode.SIX:
    case KeyCode.SEVEN:
    case KeyCode.EIGHT:
    case KeyCode.NINE:
      if (isModifierKeypressed(e)) {
        RendererManager.getInstance().forwardKeyboardInputToPixi(e)
      }
      break
  }
}
