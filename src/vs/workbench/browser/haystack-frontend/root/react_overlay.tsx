/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import { ReactScene, useGlobalState } from "../global_state/global_store"
import { RendererManager } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import { informPixiOfKeyboardEvents } from "vs/workbench/browser/haystack-frontend/canvas_utils/forward_input_to_pixi"
import { FloatingToolbar } from "vs/workbench/browser/haystack-frontend/design_components/floating_toolbar"
import { DiffEditorContainer } from "vs/workbench/browser/haystack-frontend/workspace/editors/diff_container"
import { ContextMenu } from "vs/workbench/browser/haystack-frontend/design_components/context_menu"
import { FloatingInputComponent } from "vs/workbench/browser/haystack-frontend/design_components/generic_floating_input"
import { GhostEditorContainer } from "vs/workbench/browser/haystack-frontend/workspace/editors/ghost_editor_container"
import { ModalEditorContainer } from "vs/workbench/browser/haystack-frontend/workspace/editors/modal_container"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { CodeEditorContainer } from "vs/workbench/browser/haystack-frontend/workspace/editors/code_editor_container"
import { ReferencesEditorContainer } from "vs/workbench/browser/haystack-frontend/workspace/editors/references_editor_container"
import { FeedbackButton } from "vs/workbench/browser/haystack-frontend/root/feedback_button"
import { ZoomControls } from "vs/workbench/browser/haystack-frontend/root/zoom_controls"
import { CopilotSettingsEditorContainer } from "vs/workbench/browser/haystack-frontend/workspace/editors/copilot_settings_editor_container"
import { HaystackKeybindingsEditorContainer } from "vs/workbench/browser/haystack-frontend/workspace/editors/haystack_keybindings_editor_container"
import { KeybindingsButton } from "vs/workbench/browser/haystack-frontend/root/keybindings_button"
import { CanvasEditorType } from "vs/workbench/browser/haystack-frontend/editor/editor"

interface CanvasEditorContainer {
  uuid: string
  type: CanvasEditorType
}

export function ReactOverlay() {
  const currentScene = useGlobalState((state) => state.currentScene)
  const showQuitModal = useGlobalState((state) => state.isQuitting)

  switch (currentScene) {
    case ReactScene.WORKSPACE:
      return <WorkspaceOverlay showQuitModal={showQuitModal} />
    default:
      return null
  }
}

interface WorkspaceOverlayProps {
  showQuitModal: boolean
}

function WorkspaceOverlay({ showQuitModal }: WorkspaceOverlayProps) {
  const canvasEditors = WorkspaceStoreWrapper.useWorkspaceState((state) => {
    const canvasEditors: CanvasEditorContainer[] = []
    for (const canvasEditor of state.idToEditorMap.values()) {
      canvasEditors.push({
        uuid: canvasEditor.uuid,
        type: canvasEditor.type,
      })
    }
    return canvasEditors
  })
  const contextMenuArgs = useGlobalState((state) => state.contextMenuArgs)
  const genericInputArgs = useGlobalState((state) => state.genericInputArgs)
  const quickCommandArgs = useGlobalState((state) => state.quickCommandArgs)

  const rendererManager = React.useMemo(() => RendererManager.getInstance(), [])

  return (
    <div
      className="reactOverlay"
      onKeyDownCapture={(e) => {
        informPixiOfKeyboardEvents(e)
      }}
      onKeyUpCapture={(e) => {
        informPixiOfKeyboardEvents(e)
      }}
      onPointerMoveCapture={(e) => {
        if (rendererManager.isHandlingMouseEvent()) {
          rendererManager.forwardPointerEvent(e.nativeEvent, false)
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      <FloatingToolbar />

      {canvasEditors.map((canvasEditor) => {
        switch (canvasEditor.type) {
          case CanvasEditorType.CODE_EDITOR:
            return (
              <CodeEditorContainer
                key={canvasEditor.uuid}
                editorId={canvasEditor.uuid}
              />
            )
          case CanvasEditorType.DIFF_EDITOR:
            return (
              <DiffEditorContainer
                key={canvasEditor.uuid}
                editorId={canvasEditor.uuid}
              />
            )
          case CanvasEditorType.GHOST_EDITOR:
            return (
              <GhostEditorContainer
                key={canvasEditor.uuid}
                editorId={canvasEditor.uuid}
              />
            )
          case CanvasEditorType.MODAL_EDITOR:
            return (
              <ModalEditorContainer
                key={canvasEditor.uuid}
                editorId={canvasEditor.uuid}
              />
            )
          case CanvasEditorType.REFERENCES_EDITOR:
            return (
              <ReferencesEditorContainer
                key={canvasEditor.uuid}
                editorId={canvasEditor.uuid}
              />
            )
          case CanvasEditorType.COPILOT_SETTINGS_EDITOR:
            return (
              <CopilotSettingsEditorContainer
                key={canvasEditor.uuid}
                editorId={canvasEditor.uuid}
              />
            )
          case CanvasEditorType.HAYSTACK_KEYBINDINGS_EDITOR:
            return (
              <HaystackKeybindingsEditorContainer
                key={canvasEditor.uuid}
                editorId={canvasEditor.uuid}
              />
            )
          default:
            return null
        }
      })}
      {contextMenuArgs != null && <ContextMenu {...contextMenuArgs} />}
      {genericInputArgs != null && (
        <FloatingInputComponent args={genericInputArgs} />
      )}
      <ZoomControls />
      <KeybindingsButton />
      <FeedbackButton />
    </div>
  )
}
