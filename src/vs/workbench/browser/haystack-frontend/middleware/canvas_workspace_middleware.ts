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
import { CanvasEditorType } from "vs/workbench/browser/haystack-frontend/editor/editor"

export class CanvasWorkspaceMiddleware implements Middleware {
  public middlewareType = MiddlewareType.CANVAS_WORKSPACE

  constructor() {}

  public handleStoreChange(event: StateEvent) {
    if (event.previousData === event.currentData) return

    switch (event.type) {
      case StateEventType.EDITOR_CHANGE: {
        const groupIdSet = new Set<number>()
        for (const canvasEditor of event.currentData.values()) {
          if (
            canvasEditor.type === CanvasEditorType.CODE_EDITOR &&
            canvasEditor.identifier != null
          ) {
            groupIdSet.add(canvasEditor.identifier.groupId)
          }
        }

        const currentCanvasWorkspace =
          WorkspaceStoreWrapper.getWorkspaceState().currentCanvasWorkspace
        if (currentCanvasWorkspace == null) return

        const canvasWorkspaceGroupIdSet = currentCanvasWorkspace.groupIdSet

        if (canvasWorkspaceGroupIdSet.length !== groupIdSet.size) {
          WorkspaceStoreWrapper.getWorkspaceState().setCanvasWorkspaceDirty(
            true
          )
          return
        }

        for (const groupId of canvasWorkspaceGroupIdSet) {
          if (!groupIdSet.has(groupId)) {
            WorkspaceStoreWrapper.getWorkspaceState().setCanvasWorkspaceDirty(
              true
            )
            return
          }
        }

        WorkspaceStoreWrapper.getWorkspaceState().setCanvasWorkspaceDirty(false)
        return
      }
    }
  }
}
