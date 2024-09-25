/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { RendererManager } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import * as React from "react"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

export function useCloseHeader(element: HTMLElement | null, editorId: string) {
  React.useEffect(() => {
    if (
      element == null ||
      !WorkspaceStoreWrapper.getWorkspaceState().canMiddleClickToCloseEditors()
    ) {
      return
    }

    RendererManager.getInstance()
      .getCloseHeaderBehavior()
      .addRequest(editorId, element)

    return () => {
      RendererManager.getInstance()
        .getCloseHeaderBehavior()
        .removeRequest(editorId)
    }
  }, [element, editorId])
}
