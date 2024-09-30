/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./editors"
import {
  ViewIncomingDependenciesAction,
  ViewOutgoingDependenciesAction,
} from "vs/editor/contrib/haystack/haystackActions"
import { CanvasTooltip } from "vs/workbench/browser/haystack-frontend/design_components/canvas_tooltip"
import { Orientation } from "vs/workbench/browser/haystack-frontend/design_components/ui_tooltip_common"
import { SymbolDepsType } from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import {
  IncomingDepIcon,
  OutgoingDepIcon,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/svgs"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

interface SymbolDepsButtonProps {
  depsType: SymbolDepsType
  xPosition: number
  yPosition: number
  onSelect: () => void
  isActive: boolean
}

export function SymbolDepsButton({
  depsType,
  xPosition,
  yPosition,
  onSelect,
  isActive,
}: SymbolDepsButtonProps) {
  const buttonRef = React.useRef<HTMLButtonElement | null>(null)

  return (
    <button
      style={{
        transform: `translate(${xPosition}px, ${yPosition}px)`,
      }}
      className="symbolDepsButton"
      onPointerDown={() => {
        onSelect()
        WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
          `${
            depsType === SymbolDepsType.INCOMING ? "Incoming" : "Outgoing"
          } Deps button clicked`,
        )
      }}
      ref={buttonRef}
    >
      <CanvasTooltip
        text={
          depsType === SymbolDepsType.INCOMING ? "Callers" : "Outgoing calls"
        }
        parentElement={buttonRef.current}
        orientation={
          depsType === SymbolDepsType.INCOMING
            ? Orientation.ABOVE
            : Orientation.BELOW
        }
        forceHide={isActive}
        shortcut={
          depsType === SymbolDepsType.INCOMING
            ? (WorkspaceStoreWrapper.getWorkspaceState()
                .getKeybindingForCommand(ViewIncomingDependenciesAction.ID)
                ?.getLabel() ?? undefined)
            : (WorkspaceStoreWrapper.getWorkspaceState()
                .getKeybindingForCommand(ViewOutgoingDependenciesAction.ID)
                ?.getLabel() ?? undefined)
        }
      />
      {depsType === SymbolDepsType.INCOMING ? (
        <IncomingDepIcon />
      ) : (
        <OutgoingDepIcon />
      )}
    </button>
  )
}
