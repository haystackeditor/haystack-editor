/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { SpatialSortMiddleware } from "vs/workbench/browser/haystack-frontend/middleware/spatial_sort_middleware"
import { Middleware, MiddlewareType } from "./middleware_common"
import { UndoRedoMiddleware } from "vs/workbench/browser/haystack-frontend/middleware/undo_redo_middleware"
import { CanvasWorkspaceMiddleware } from "vs/workbench/browser/haystack-frontend/middleware/canvas_workspace_middleware"
import { HistoryStackMiddleware } from "vs/workbench/browser/haystack-frontend/middleware/history_stack_middleware"

// TODO: Make this per scene.
export class MiddlewareManager {
  public registeredMiddleware: Middleware[] = []
  private spatialSortMiddleware = new SpatialSortMiddleware()
  private undoRedoMiddleware = new UndoRedoMiddleware()
  private canvasWorkspaceMiddleware = new CanvasWorkspaceMiddleware()
  private historyStackMiddleware = new HistoryStackMiddleware()

  constructor() {}

  public registerMiddleware(middlewareType: MiddlewareType) {
    switch (middlewareType) {
      case MiddlewareType.SPATIAL_SORT:
        this.spatialSortMiddleware = new SpatialSortMiddleware()
        this.registeredMiddleware.push(this.spatialSortMiddleware)
        break
      case MiddlewareType.UNDO_REDO:
        this.undoRedoMiddleware = new UndoRedoMiddleware()
        this.registeredMiddleware.push(this.undoRedoMiddleware)
        break
      case MiddlewareType.CANVAS_WORKSPACE:
        this.canvasWorkspaceMiddleware = new CanvasWorkspaceMiddleware()
        this.registeredMiddleware.push(this.canvasWorkspaceMiddleware)
        break
      case MiddlewareType.HISTORY_STACK:
        this.historyStackMiddleware = new HistoryStackMiddleware()
        this.registeredMiddleware.push(this.historyStackMiddleware)
    }
  }

  public getMiddleware(middlewareType: MiddlewareType) {
    switch (middlewareType) {
      case MiddlewareType.SPATIAL_SORT:
        return this.spatialSortMiddleware
      case MiddlewareType.UNDO_REDO:
        return this.undoRedoMiddleware
      case MiddlewareType.CANVAS_WORKSPACE:
        return this.canvasWorkspaceMiddleware
      case MiddlewareType.HISTORY_STACK:
        return this.historyStackMiddleware
    }
  }
}

export const middlewareManager = new MiddlewareManager()
