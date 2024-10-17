/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { MoveOptions } from "../canvas/pointer_event_handlers/move_handler"
import { RendererManager } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import * as React from "react"
import * as uuid from "vs/base/common/uuid"

export function useMoveable(
  element: HTMLElement | null,
  options: MoveOptions,
  useMoveBehaviorCondition?: boolean
) {
  React.useEffect(() => {
    if (element == null || useMoveBehaviorCondition === false) return
    const id = uuid.generateUuid()

    RendererManager.getInstance()
      .getMoveBehavior()
      .addRequest(id, element, options)

    return () => {
      RendererManager.getInstance().getMoveBehavior().removeRequest(id)
    }
  }, [element, options, useMoveBehaviorCondition])
}
