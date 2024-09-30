/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { StateEvent } from "vs/workbench/browser/haystack-frontend/middleware/state_event"

export interface Middleware {
  middlewareType: MiddlewareType
  handleStoreChange(event: StateEvent): void
}

export const enum MiddlewareType {
  SPATIAL_SORT = 0,
  UNDO_REDO = 1,
  CANVAS_WORKSPACE = 2,
  HISTORY_STACK = 3,
}
