/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode } from "vs/workbench/browser/haystack-frontend/canvas/keyboard_constants"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { commitAction } from "vs/workbench/browser/haystack-frontend/canvas_utils/commit_action"
import { useDebounce } from "vs/workbench/browser/haystack-frontend/react_utils/debounce"
import { isModifierKeypressed } from "vs/workbench/browser/haystack-frontend/react_utils/platform"
import {
  BUMP_MOVE_DELTA,
  NUDGE_MOVE_DELTA,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/shared_constants"
import * as React from "react"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

export function useHandleBoundsKeyDown(
  editorId: string,
  resizeHorizontalCheck?: () => boolean,
  resizeVerticalCheck?: () => boolean,
) {
  const debouncedCommit = useDebounce(commitAction, 100, [])

  return React.useCallback(
    (e: React.KeyboardEvent) => {
      resizeHorizontalCheck = resizeHorizontalCheck ?? (() => true)
      resizeVerticalCheck = resizeVerticalCheck ?? (() => true)
      switch (e.code) {
        case KeyCode.ARROW_DOWN: {
          const deltaVector = new Vector(
            0,
            e.shiftKey ? BUMP_MOVE_DELTA : NUDGE_MOVE_DELTA,
          )
          WorkspaceStoreWrapper.getWorkspaceState().updateEditorBounds(
            editorId,
            isModifierKeypressed(e.nativeEvent) ? Vector.new() : deltaVector,
            isModifierKeypressed(e.nativeEvent) && resizeVerticalCheck()
              ? deltaVector
              : Vector.new(),
          )
          debouncedCommit()
          return true
        }
        case KeyCode.ARROW_UP: {
          const deltaVector = new Vector(
            0,
            -(e.shiftKey ? BUMP_MOVE_DELTA : NUDGE_MOVE_DELTA),
          )
          WorkspaceStoreWrapper.getWorkspaceState().updateEditorBounds(
            editorId,
            isModifierKeypressed(e.nativeEvent) ? Vector.new() : deltaVector,
            isModifierKeypressed(e.nativeEvent) && resizeVerticalCheck()
              ? deltaVector
              : Vector.new(),
          )
          debouncedCommit()
          return true
        }
        case KeyCode.ARROW_RIGHT: {
          const deltaVector = new Vector(
            e.shiftKey ? BUMP_MOVE_DELTA : NUDGE_MOVE_DELTA,
            0,
          )
          WorkspaceStoreWrapper.getWorkspaceState().updateEditorBounds(
            editorId,
            isModifierKeypressed(e.nativeEvent) ? Vector.new() : deltaVector,
            isModifierKeypressed(e.nativeEvent) && resizeHorizontalCheck?.()
              ? deltaVector
              : Vector.new(),
          )
          debouncedCommit()
          return true
        }
        case KeyCode.ARROW_LEFT: {
          const deltaVector = new Vector(
            -(e.shiftKey ? BUMP_MOVE_DELTA : NUDGE_MOVE_DELTA),
            0,
          )
          WorkspaceStoreWrapper.getWorkspaceState().updateEditorBounds(
            editorId,
            isModifierKeypressed(e.nativeEvent) ? Vector.new() : deltaVector,
            isModifierKeypressed(e.nativeEvent) && resizeHorizontalCheck()
              ? deltaVector
              : Vector.new(),
          )
          debouncedCommit()
          return true
        }
      }
      return false
    },
    [resizeHorizontalCheck, resizeVerticalCheck, editorId, debouncedCommit],
  )
}
