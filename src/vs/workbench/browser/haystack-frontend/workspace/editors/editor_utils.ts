/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import { RendererManager } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import {
  isMacLike,
  isModifierKeypressed,
} from "vs/workbench/browser/haystack-frontend/react_utils/platform"
import { KeyCode } from "vs/workbench/browser/haystack-frontend/canvas/keyboard_constants"
import { commitAction } from "vs/workbench/browser/haystack-frontend/canvas_utils/commit_action"
import { focusOnPixiCanvas } from "vs/workbench/browser/haystack-frontend/canvas_utils/focus_on_pixi_canvas"
import { forwardKeyboardInputToPixi } from "vs/workbench/browser/haystack-frontend/mirror/react_to_pixi"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { canvasRef } from "vs/workbench/browser/haystack-frontend/root/app_common"

export function useScrollHandler() {
  return React.useCallback((e: React.WheelEvent) => {
    const rendererManager = RendererManager.getInstance()
    // We don't want to steal wheel events from the canvas when a scroll was initiated there or if the user is pressing the alt key.
    if (
      !rendererManager.isScrolling() &&
      !e.ctrlKey &&
      !isModifierKeypressed(e) &&
      !e.altKey
    ) {
      return
    }

    RendererManager.getInstance().handleWheelEvent(e.nativeEvent)
    e.stopPropagation()
  }, [])
}

export function useEditorOnKeyDown(
  editorId: string,
  containerElement: HTMLDivElement | null,
  handleBounds: (e: React.KeyboardEvent) => boolean,
  deleteEditorsInSelection: () => void,
  saveEditor: () => void,
) {
  return React.useCallback(
    (e: React.KeyboardEvent) => {
      if (handleBounds(e)) return
      switch (e.code) {
        case KeyCode.ENTER: {
          WorkspaceStoreWrapper.getWorkspaceState().focusOnEditor(editorId)
          e.preventDefault()
          e.stopPropagation()
          break
        }
        case KeyCode.ESCAPE:
          canvasRef.current?.focus()
          WorkspaceStoreWrapper.getWorkspaceState().clearSelection()
          e.preventDefault()
          e.stopPropagation()
          break
        case KeyCode.DELETE:
        case KeyCode.BACKSPACE: {
          deleteEditorsInSelection()
          commitAction()
          focusOnPixiCanvas()
          break
        }
        case KeyCode.S: {
          if (isModifierKeypressed(e.nativeEvent)) {
            saveEditor()
            e.preventDefault()
            e.stopPropagation()
          }
          break
        }
        default: {
          forwardKeyboardInputToPixi(e.nativeEvent)
          break
        }
      }
    },
    [containerElement, handleBounds, deleteEditorsInSelection, saveEditor],
  )
}

export function useEditorOnKeyDownCapture(
  deleteEditor: () => void,
  saveEditor: () => void,
) {
  return React.useCallback(
    (e: React.KeyboardEvent) => {
      const isMac = isMacLike()

      switch (e.code) {
        case KeyCode.W:
          if (isModifierKeypressed(e.nativeEvent)) {
            deleteEditor()
            commitAction()
            e.preventDefault()
            e.stopPropagation()
          }
          break
        case KeyCode.F4:
          if (!isMac && e.altKey) {
            deleteEditor()
            commitAction()
            e.preventDefault()
            e.stopPropagation()
          }
          break
        case KeyCode.P:
          if (isModifierKeypressed(e.nativeEvent)) {
            forwardKeyboardInputToPixi(e.nativeEvent)
          }
          break
        case KeyCode.S: {
          if (isModifierKeypressed(e.nativeEvent)) {
            saveEditor()
            e.preventDefault()
            e.stopPropagation()
          }
          break
        }
        case KeyCode.ARROW_RIGHT:
        case KeyCode.ARROW_LEFT:
          // Used for jumping between editors via keyboard.
          if (e.altKey && isModifierKeypressed(e.nativeEvent)) {
            forwardKeyboardInputToPixi(e.nativeEvent)
          }
          break
        case KeyCode.I:
          if (isModifierKeypressed(e.nativeEvent) && e.shiftKey) {
            forwardKeyboardInputToPixi(e.nativeEvent)
          }
          break
      }
    },
    [saveEditor, deleteEditor],
  )
}
