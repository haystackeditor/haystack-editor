/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./app"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

export interface KeybindingsButtonProps {}

export function KeybindingsButton({}: KeybindingsButtonProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  return (
    <div
      className="keybindingsButtonContainer"
      style={{
        right: "25px",
        bottom: "60px",
      }}
      ref={containerRef}
    >
      <button
        className="keybindingsButton"
        onClick={() => {
          WorkspaceStoreWrapper.getWorkspaceState().insertHaystackKeybindingsEditorAtCenterOfViewport()
          WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
            "Haystack keybindings opened"
          )
        }}
      >
        {"Keybindings and Help"}
      </button>
    </div>
  )
}
