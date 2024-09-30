/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./app"
import { CanvasTooltip } from "vs/workbench/browser/haystack-frontend/design_components/canvas_tooltip"
import { Orientation } from "vs/workbench/browser/haystack-frontend/design_components/ui_tooltip_common"
import { isMacLike } from "vs/workbench/browser/haystack-frontend/react_utils/platform"
import {
  MAX_CANVAS_SCALE,
  MIN_CANVAS_SCALE,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

const EPSILON = 10 ^ -12

export interface ZoomControlProps {}

export function ZoomControls({}: ZoomControlProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  const [zoomValueElement, setZoomValueElement] =
    React.useState<HTMLButtonElement | null>(null)
  const zoomValueRef = React.useCallback((zoomValue: HTMLButtonElement) => {
    setZoomValueElement(zoomValue)
  }, [])

  const [zoomInButton, setZoomInButton] =
    React.useState<HTMLButtonElement | null>(null)
  const zoomInRef = React.useCallback((zoomIn: HTMLButtonElement) => {
    setZoomInButton(zoomIn)
  }, [])
  const [zoomOutButton, setZoomOutButton] =
    React.useState<HTMLButtonElement | null>(null)
  const zoomOutRef = React.useCallback((zoomOut: HTMLButtonElement) => {
    setZoomOutButton(zoomOut)
  }, [])

  const scale = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.canvasScale,
  )

  return (
    <div
      className="zoomControlsContainer"
      style={{
        right: "25px",
        bottom: "100px",
      }}
      ref={containerRef}
    >
      <button
        className="zoomInButton"
        onClick={() => {
          // Because floating point operations are imprecise, using ceil or floor here might
          // give a bad answer.
          const roundedScale = Math.round(scale / 0.2) * 0.2
          // If the scale is not divisible by 0.2, we should just round it up
          // to the next number divisible by 0.2. Otherwise, increase the scale
          // as per normal
          const nextScale =
            Math.abs(roundedScale - scale) < EPSILON
              ? Math.min(MAX_CANVAS_SCALE, Math.round((scale + 0.2) * 10) / 10)
              : roundedScale > scale
                ? roundedScale
                : Math.min(MAX_CANVAS_SCALE, roundedScale + 0.2)
          WorkspaceStoreWrapper.getWorkspaceState().setZoomLevel(nextScale)
          WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
            "zoom in 10% button clicked",
          )
        }}
        ref={zoomInRef}
      >
        <CanvasTooltip
          text={"Zoom in 10%"}
          parentElement={zoomInButton}
          orientation={Orientation.ABOVE}
        />
        <i className="codicon codicon-add" />
      </button>
      <button
        className="zoomValueButton"
        ref={zoomValueRef}
        onClick={() => {
          WorkspaceStoreWrapper.getWorkspaceState().setZoomLevel(1.0)
          WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
            "reset scale clicked",
          )
        }}
      >
        <CanvasTooltip
          text={`${
            isMacLike() ? "⌘" : "Ctrl"
          } + scroll to adjust zoom or click to reset to 100%`}
          parentElement={zoomValueElement}
          orientation={Orientation.LEFT}
        />
        {`${Math.round(scale * 100)}%`}
      </button>
      <button
        className="zoomOutButton"
        onClick={() => {
          // Because floating point operations are imprecise, using ceil or floor here might
          // give a bad answer.
          const roundedScale = Math.round(scale / 0.2) * 0.2
          // If the scale is not divisible by 0.2, we should just round it up
          // to the next number divisible by 0.2. Otherwise, increase the scale
          // as per normal
          const nextScale =
            Math.abs(roundedScale - scale) < EPSILON
              ? Math.max(MIN_CANVAS_SCALE, Math.round((scale - 0.2) * 10) / 10)
              : roundedScale < scale
                ? roundedScale
                : Math.max(MIN_CANVAS_SCALE, roundedScale - 0.2)
          WorkspaceStoreWrapper.getWorkspaceState().setZoomLevel(nextScale)
          WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
            "zoom out 10% button clicked",
          )
        }}
        ref={zoomOutRef}
      >
        <CanvasTooltip
          text={"Zoom out 10%"}
          parentElement={zoomOutButton}
          orientation={Orientation.BELOW}
        />
        <i className="codicon codicon-remove" />
      </button>
    </div>
  )
}
