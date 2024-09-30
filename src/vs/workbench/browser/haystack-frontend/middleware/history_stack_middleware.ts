/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import {
  StateEvent,
  StateEventType,
} from "vs/workbench/browser/haystack-frontend/middleware/state_event"
import { Middleware, MiddlewareType } from "./middleware_common"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { CanvasEditor } from "vs/workbench/browser/haystack-frontend/editor/editor"

export class HistoryStackMiddleware implements Middleware {
  public middlewareType = MiddlewareType.HISTORY_STACK

  constructor() {}

  public async handleStoreChange(event: StateEvent) {
    switch (event.type) {
      case StateEventType.EDITOR_CHANGE: {
        const currentIdToEditorMap = event.currentData
        const previousIdToEditorMap = event.previousData

        if (this.editorsChanged(currentIdToEditorMap, previousIdToEditorMap)) {
          // Clean history stacks to make sure they don't point to invalid editors.
          WorkspaceStoreWrapper.getWorkspaceState().cleanHistoryStacks(
            currentIdToEditorMap,
          )
          // Update button state.
          WorkspaceStoreWrapper.getWorkspaceState().haystackService?.setNavigationButtonState(
            WorkspaceStoreWrapper.getWorkspaceState().previousEditorHistoryStack
              .length,
            WorkspaceStoreWrapper.getWorkspaceState().nextEditorHistoryStack
              .length,
          )
        }

        return
      }
    }
  }

  private editorsChanged(
    currentIdToEditorMap: Map<string, CanvasEditor>,
    previousIdToEditorMap: Map<string, CanvasEditor>,
  ): boolean {
    if (currentIdToEditorMap.size !== previousIdToEditorMap.size) {
      return true // Size difference indicates a change
    }

    for (const id of currentIdToEditorMap.keys()) {
      if (!previousIdToEditorMap.has(id)) return true
    }

    return false // No changes detected
  }
}
