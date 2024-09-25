/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { focusOnPixiCanvas } from "vs/workbench/browser/haystack-frontend/canvas_utils/focus_on_pixi_canvas"
import {
  ContextMenuActionGroup,
  useGlobalState,
} from "vs/workbench/browser/haystack-frontend/global_state/global_store"
import * as React from "react"
import "vs/css!./design_components"
import { Divider } from "./divider"

interface ContextMenuProps {
  topOffset: number
  leftOffset: number
  actionGroups: ContextMenuActionGroup[]
}

export function ContextMenu({
  actionGroups,
  topOffset,
  leftOffset,
}: ContextMenuProps) {
  const closeContextMenu = useGlobalState((state) => state.closeContextMenu)
  const closeContextMenuWrapper = () => {
    closeContextMenu()
    focusOnPixiCanvas()
  }
  const contextMenuRef = React.useRef<HTMLDivElement>(null)
  const onKeyDown = (e: React.KeyboardEvent) => {
    blockEvent(e.nativeEvent)
  }

  React.useEffect(() => {
    contextMenuRef.current?.focus()
  }, [])

  return (
    <div
      className="contextMenu"
      style={{ top: `${topOffset}px`, left: `${leftOffset}px` }}
      tabIndex={0}
      ref={contextMenuRef}
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (!contextMenuRef.current?.contains(e.relatedTarget)) {
          closeContextMenu()
        }
      }}
    >
      {actionGroups.map((actionGroup, i) => (
        <div key={actionGroup.id}>
          <div className="contextMenuActionGroup">
            {actionGroup.actions.map((action) => (
              <button
                key={action.id}
                className="contextMenuAction"
                onClick={() => {
                  action.triggerAction()
                  closeContextMenuWrapper()
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
          {i < actionGroups.length - 1 ? <Divider /> : null}
        </div>
      ))}
    </div>
  )
}

function blockEvent(e: Event) {
  e.preventDefault()
  e.stopPropagation()
}
