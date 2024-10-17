/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./file_editor"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

interface CopilotSettingsEditorProps {}

export const CopilotSettingsEditor = React.memo(
  function CopilotSettingsEditor({}: CopilotSettingsEditorProps) {
    const openAiSettings = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.openAiSettings
    )

    return (
      <div
        className={classNames({
          fileEditor: true,
          modal: true,
        })}
      >
        <div className="settingsEditorContainer">
          <div className="settingsEditorTitle">Open AI Settings</div>
          <div>
            <div className="settingsEditorSection">OpenAI API Key</div>
            <input
              className="settingsEditorInput"
              placeholder="Please enter your OpenAI API Key"
              defaultValue={openAiSettings.apiKey ?? undefined}
              onChange={(e) => {
                WorkspaceStoreWrapper.getWorkspaceState().setOpenAiSettings({
                  ...openAiSettings,
                  apiKey: e.target.value,
                })
                e.target.value
              }}
            />
          </div>
          <div>
            <div className="settingsEditorSection">
              OpenAI API Organization ID
            </div>
            <input
              className="settingsEditorInput"
              placeholder="Please enter your OpenAI Organization ID"
              defaultValue={openAiSettings.organizationid ?? undefined}
              onChange={(e) => {
                WorkspaceStoreWrapper.getWorkspaceState().setOpenAiSettings({
                  ...openAiSettings,
                  organizationid: e.target.value,
                })
                e.target.value
              }}
            />
          </div>
          <div>
            <div className="settingsEditorSection">Open AI Endpoint</div>
            <input
              className="settingsEditorInput"
              placeholder="Please enter your OpenAI Endpoint"
              defaultValue={openAiSettings.endpoint ?? undefined}
              onChange={(e) => {
                WorkspaceStoreWrapper.getWorkspaceState().setOpenAiSettings({
                  ...openAiSettings,
                  endpoint: e.target.value,
                })
                e.target.value
              }}
            />
          </div>
        </div>
      </div>
    )
  }
)
