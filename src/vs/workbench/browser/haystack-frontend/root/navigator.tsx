/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
// @ts-ignore
import { createRoot } from "react-dom"
import "vs/css!./app"
import {
  CanvasEditor,
  CanvasEditorType,
} from "vs/workbench/browser/haystack-frontend/editor/editor"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { NavigationType } from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import { SmallFileSvg } from "vs/workbench/browser/haystack-frontend/workspace/editors/svgs"
import { getSymbolIcon } from "vs/workbench/browser/haystack-frontend/workspace/editors/utils/get_symbol_icon"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

interface CanvasEditorMetadata {
  icon: React.JSX.Element
  mainLabel: string
  supportingLabel: string
}

interface NavigatorViewProps {}

function NavigatorView({}: NavigatorViewProps) {
  const canvasEditors = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.sortedEditors,
  )
  const selection = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.selection,
  )

  return (
    <div className="navigatorView">
      {canvasEditors.map((canvasEditor) => {
        const editorMetadata = getEditorMetadata(canvasEditor)
        if (editorMetadata == null) return null
        const isSelected = selection.has(canvasEditor.uuid)

        return (
          <button
            key={canvasEditor.uuid}
            className={classNames({
              navigatorNode: true,
              selected: isSelected,
            })}
            onClick={() => {
              WorkspaceStoreWrapper.getWorkspaceState().navigateToEditor(
                canvasEditor,
                NavigationType.CENTER,
              )
              WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
                "Navigator view node clicked",
              )
            }}
          >
            <div className="navigatorNodeIcon">{editorMetadata.icon}</div>
            <div className="navigatorNodeMainLabel">
              {editorMetadata.mainLabel}
            </div>
            <div className="navigatorNodeSupportingLabel">
              {editorMetadata.supportingLabel}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function getEditorMetadata(editor: CanvasEditor): CanvasEditorMetadata | null {
  switch (editor.type) {
    case CanvasEditorType.GHOST_EDITOR:
    case CanvasEditorType.DIFF_EDITOR:
    case CanvasEditorType.CODE_EDITOR: {
      if (editor.isGhost) return null
      const rootDirNameLen =
        WorkspaceStoreWrapper.getWorkspaceState().getWorkspacePath()?.length
      const relativeFilePath =
        rootDirNameLen == null
          ? editor.filePath
          : editor.filePath.substring(rootDirNameLen)

      return {
        icon: editor.symbolType ? (
          getSymbolIcon(editor.symbolType, {
            width: 15,
            height: 15,
            darkMode: WorkspaceStoreWrapper.getWorkspaceState().isDarkMode(),
          })
        ) : (
          <SmallFileSvg
            width={15}
            height={15}
            darkMode={WorkspaceStoreWrapper.getWorkspaceState().isDarkMode()}
          />
        ),
        mainLabel: editor.symbolName
          ? editor.symbolName
          : editor.filePath.split("/").pop()!,
        supportingLabel: relativeFilePath,
      }
    }
    default: {
      return null
    }
  }
}

export function renderNavigatorView(container: HTMLElement) {
  const root = createRoot(container)
  root.render(<NavigatorView />)
}
