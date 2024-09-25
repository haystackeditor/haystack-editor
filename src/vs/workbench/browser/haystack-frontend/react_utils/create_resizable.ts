/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { ResizableOptions } from "../canvas/pointer_event_handlers/resize_handler"
import { RendererManager } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import * as React from "react"
import * as uuid from "vs/base/common/uuid"

export function useResizable(
  element: HTMLElement | null,
  options: ResizableOptions,
) {
  React.useEffect(() => {
    if (element == null) return

    const id = uuid.generateUuid()

    RendererManager.getInstance()
      .getResizeBehavior()
      .addRequest(id, element, options)

    return () => {
      RendererManager.getInstance().getResizeBehavior().removeRequest(id)
    }
  }, [element, options])
}
