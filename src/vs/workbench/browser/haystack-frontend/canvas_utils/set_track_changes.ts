/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { middlewareManager } from "vs/workbench/browser/haystack-frontend/middleware/middleware"
import { MiddlewareType } from "vs/workbench/browser/haystack-frontend/middleware/middleware_common"
import { UndoRedoMiddleware } from "vs/workbench/browser/haystack-frontend/middleware/undo_redo_middleware"

export function setTrackChanges(trackChanges: boolean) {
  const undoRedoMiddleware = middlewareManager.getMiddleware(
    MiddlewareType.UNDO_REDO,
  ) as UndoRedoMiddleware
  if (undoRedoMiddleware != null) {
    undoRedoMiddleware.setTrackChanges(trackChanges)
  }
}
