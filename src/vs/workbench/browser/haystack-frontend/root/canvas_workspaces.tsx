/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
// @ts-ignore
import { createRoot } from "react-dom"
import "vs/css!./app"
import { ConfirmResult } from "vs/platform/dialogs/common/dialogs"
import { KeyCode } from "vs/workbench/browser/haystack-frontend/canvas/keyboard_constants"
import { UiTooltip } from "vs/workbench/browser/haystack-frontend/design_components/ui_tooltip"
import { Orientation } from "vs/workbench/browser/haystack-frontend/design_components/ui_tooltip_common"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { CanvasWorkspace } from "vs/workbench/services/haystack/browser/canvasWorkspaceCommon"

interface CanvasWorkspaceViewProps {}

function CanvasWorkspaceView({}: CanvasWorkspaceViewProps) {
  const workspaces = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.canvasWorkspaces,
  )

  const inputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    WorkspaceStoreWrapper.getWorkspaceState().loadCanvasWorkspaces()
  }, [])

  return (
    <div className="canvasWorkspaceView">
      <div className="addCanvasWorkspaceButtonContainer">
        <input
          ref={inputRef}
          placeholder="Name for workspace"
          className="addCanvasWorkspaceInput"
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.code !== KeyCode.ENTER || inputRef.current == null) {
              return
            }

            WorkspaceStoreWrapper.getWorkspaceState().saveCurrentCanvasWorkspace(
              inputRef.current.value,
              WorkspaceStoreWrapper.getWorkspaceState().canvasCamera,
              WorkspaceStoreWrapper.getWorkspaceState().canvasScale,
            )

            WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
              "Current canvas workspace saved",
            )

            inputRef.current.value = ""
          }}
        />
        <button
          className="addCanvasWorkspaceButton"
          onClick={() => {
            if (inputRef.current && inputRef.current.value.length > 0) {
              WorkspaceStoreWrapper.getWorkspaceState().saveCurrentCanvasWorkspace(
                inputRef.current.value,
                WorkspaceStoreWrapper.getWorkspaceState().canvasCamera,
                WorkspaceStoreWrapper.getWorkspaceState().canvasScale,
              )

              WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
                "Current canvas workspace saved",
              )

              inputRef.current.value = ""
            }
          }}
        >
          Save Workspace
        </button>
      </div>
      <div className="canvasWorkspaceList">
        {workspaces.length > 0 ? (
          workspaces.map((workspace) => {
            return (
              <CanvasWorkspaceButton
                key={workspace.uniqueId}
                workspace={workspace}
              />
            )
          })
        ) : (
          <div className="emptySavedWorkspacesText">No saved workspaces</div>
        )}
      </div>
    </div>
  )
}

interface CanvasWorkspaceButtonProps {
  workspace: CanvasWorkspace
}

function CanvasWorkspaceButton({ workspace }: CanvasWorkspaceButtonProps) {
  const [saveButtonElement, setSaveButtonElement] =
    React.useState<HTMLButtonElement | null>(null)
  const saveButtonRef = React.useCallback(
    (saveButtonElement: HTMLButtonElement) => {
      setSaveButtonElement(saveButtonElement)
    },
    [setSaveButtonElement],
  )
  const [removeButtonElement, setRemoveButtonElement] =
    React.useState<HTMLButtonElement | null>(null)
  const removeButtonRef = React.useCallback(
    (removeButtonElement: HTMLButtonElement) => {
      setRemoveButtonElement(removeButtonElement)
    },
    [setRemoveButtonElement],
  )

  const currentCanvasWorkspace = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.currentCanvasWorkspace,
  )

  return (
    <div
      className={classNames({
        canvasWorkspaceButtonContainer: true,
        current: currentCanvasWorkspace?.uniqueId === workspace.uniqueId,
      })}
      key={workspace.uniqueId}
      onClick={async () => {
        const canvasWorkspaceDirty =
          WorkspaceStoreWrapper.getWorkspaceState().canvasWorkspaceIsDirty

        if (canvasWorkspaceDirty) {
          const result =
            await WorkspaceStoreWrapper.getWorkspaceState().showConfirmationDialog(
              "You have unsaved changes in your current workspace",
              "Your changes to the current workspace will be lost if you don't save them",
              "Save",
              "Don't save",
            )

          switch (result) {
            case ConfirmResult.SAVE:
              WorkspaceStoreWrapper.getWorkspaceState().overwriteCurrentCanvasWorkspace()
              WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
                "Overwrote current canvas workplace via dialog",
              )
              break
            case ConfirmResult.DONT_SAVE:
              WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
                "Loaded new canvas workspace without saving",
              )
              break
            case ConfirmResult.CANCEL:
              // In this case, we want to exit.
              return
          }
        }

        WorkspaceStoreWrapper.getWorkspaceState().openCanvasWorkspace(
          workspace.uniqueId,
        )
        WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
          "Canvas workspace loaded",
        )
      }}
    >
      <div className="canvasWorkspaceButton">
        <div className="workspaceLabel">{workspace.name}</div>
      </div>
      {currentCanvasWorkspace?.uniqueId === workspace.uniqueId && (
        <button
          ref={saveButtonRef}
          className="saveCanvasWorkspaceButton"
          onClick={(e) => {
            WorkspaceStoreWrapper.getWorkspaceState().overwriteCurrentCanvasWorkspace()
            WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
              "Overwrote current canvas workplace",
            )
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <UiTooltip
            text={"Overwrite workspace"}
            parentElement={saveButtonElement}
            orientation={Orientation.ABOVE}
          />
          <i className="codicon codicon-save" />
        </button>
      )}
      <button
        ref={removeButtonRef}
        className="removeCanvasWorkspaceButton"
        onClick={(e) => {
          WorkspaceStoreWrapper.getWorkspaceState().deleteCanvasWorkspace(
            workspace.uniqueId,
          )
          WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
            "Canvas workspace removed",
          )
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <UiTooltip
          text={"Remove workspace"}
          parentElement={removeButtonElement}
          orientation={Orientation.ABOVE}
        />
        <i className="codicon codicon-trash" />
      </button>
    </div>
  )
}

export function renderCanvasWorkspacesView(container: HTMLElement) {
  const root = createRoot(container)
  root.render(<CanvasWorkspaceView />)
}
