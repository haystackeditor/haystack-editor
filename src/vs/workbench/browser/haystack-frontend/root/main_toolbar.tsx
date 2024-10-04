/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import { UiTooltip } from "vs/workbench/browser/haystack-frontend/design_components/ui_tooltip"
import { Orientation } from "vs/workbench/browser/haystack-frontend/design_components/ui_tooltip_common"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

export function MainToolbar() {
  const [removeAllEditorsButtonElement, setRemoveAllEditorsButtonElement] =
    React.useState<HTMLButtonElement | null>(null)
  const removeAllEditorsButtonRef = React.useCallback(
    (removeButton: HTMLButtonElement) => {
      setRemoveAllEditorsButtonElement(removeButton)
    },
    [],
  )
  const [rearrangeEditorsButtonElement, setRearrangeEditorsButtonElement] =
    React.useState<HTMLButtonElement | null>(null)
  const rearrangeEditorsButtonRef = React.useCallback(
    (rearrangeEditorsButton: HTMLButtonElement) => {
      setRearrangeEditorsButtonElement(rearrangeEditorsButton)
    },
    [],
  )
  const [saveDirtyWorkspaceButtonElement, setSaveDirtyWorkspaceButtonElement] =
    React.useState<HTMLButtonElement | null>(null)
  const saveDirtyWorkspaceButtonRef = React.useCallback(
    (saveDirtyWorkspaceButton: HTMLButtonElement) => {
      setSaveDirtyWorkspaceButtonElement(saveDirtyWorkspaceButton)
    },
    [],
  )
  const [resetZoomButtonElement, setResetZoomButtonElement] =
    React.useState<HTMLButtonElement | null>(null)
  const resetZoomButtonRef = React.useCallback(
    (resetZoomButton: HTMLButtonElement) => {
      setResetZoomButtonElement(resetZoomButton)
    },
    [],
  )

  const [
    currentCanvasWorkspaceIsDirty,
    darkMode,
    showNavigationBar,
    canvasScale,
  ] = WorkspaceStoreWrapper.useWorkspaceState((state) => [
    state.canvasWorkspaceIsDirty,
    state.isDarkMode(),
    state.showNavigationBar,
    state.canvasScale,
  ])

  return (
    showNavigationBar && (
      <div className={classNames({ haystackToolbar: true, darkMode })}>
        <button
          ref={removeAllEditorsButtonRef}
          className="mainToolbarButton"
          onClick={() => {
            WorkspaceStoreWrapper.getWorkspaceState().closeAllEditors()
            WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
              "Clicked close all editors button",
            )
          }}
        >
          <UiTooltip
            text={"Clear all editors from canvas"}
            parentElement={removeAllEditorsButtonElement}
            orientation={Orientation.BELOW}
          />
          <i className="codicon codicon-trash" />
        </button>
        <button
          ref={rearrangeEditorsButtonRef}
          className="mainToolbarButton"
          onClick={() => {
            WorkspaceStoreWrapper.getWorkspaceState().rearrangeAllEditors()
            WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
              "Clicked rearrange all editors button",
            )
          }}
        >
          <UiTooltip
            text={"Rearrange all editor windows"}
            parentElement={rearrangeEditorsButtonElement}
            orientation={Orientation.BELOW}
          />
          <i className="codicon codicon-editor-layout" />
        </button>
        {canvasScale !== 1.0 && (
          <button
            ref={resetZoomButtonRef}
            className="mainToolbarButton"
            onClick={() => {
              WorkspaceStoreWrapper.getWorkspaceState().setZoomLevel(1.0)
              WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
                "Clicked reset zoom level button in top toolbar",
              )
            }}
          >
            <UiTooltip
              text={"Reset zoom level to 100%"}
              parentElement={resetZoomButtonElement}
              orientation={Orientation.BELOW}
            />
            <i
              className={`codicon codicon-zoom-${
                canvasScale > 1.0 ? "out" : "in"
              }`}
            />
          </button>
        )}
        {currentCanvasWorkspaceIsDirty && (
          <button
            ref={saveDirtyWorkspaceButtonRef}
            className="mainToolbarButton"
            onClick={() => {
              WorkspaceStoreWrapper.getWorkspaceState().overwriteCurrentCanvasWorkspace()
              WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
                "Clicked overwrite current canvas workspace",
              )
            }}
          >
            <UiTooltip
              text={"Overwrite current canvas workspace"}
              parentElement={saveDirtyWorkspaceButtonElement}
              orientation={Orientation.BELOW}
            />
            <i className="codicon codicon-save-as" />
          </button>
        )}
      </div>
    )
  )
}
