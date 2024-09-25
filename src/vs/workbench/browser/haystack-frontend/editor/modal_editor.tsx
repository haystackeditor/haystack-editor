/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./file_editor"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { IRange } from "vs/editor/common/core/range"
import {
  IEditorOptions,
  IResourceEditorInput,
} from "vs/platform/editor/common/editor"
import { EditorInput } from "vs/workbench/common/editor/editorInput"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { HEADER_HEIGHT } from "vs/workbench/browser/haystack-frontend/editor/editor_header"

export const enum EditorType {
  STANDALONE = 0,
  REFERENCES = 1,
}

interface ModalEditorProps {
  input: EditorInput | IResourceEditorInput
  selectionRange: IRange | null
  editorId: string
  options: IEditorOptions | null
}

export const ModalEditor = React.memo(function ModalEditor({
  input,
  editorId,
  options,
}: ModalEditorProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  function getProperties() {
    return {
      editorId: editorId,
      editorType: "modal",
      edited: false,
    }
  }

  React.useEffect(() => {
    // Async function.
    async function openModalEditor() {
      if (containerRef.current == null) return

      // Remove all old children.
      for (const child of containerRef.current!.children) {
        containerRef.current!.removeChild(child)
      }

      await WorkspaceStoreWrapper.getWorkspaceState().openModalEditorForCanvasEditor(
        editorId,
        input,
        containerRef.current,
        options ?? undefined,
      )
      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
        "editor opened",
        getProperties(),
      )
    }

    openModalEditor()
  }, [input, options])

  const canvasEditor = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.idToEditorMap.get(editorId),
  )

  return (
    <div
      className={classNames({
        fileEditor: true,
        modal: true,
      })}
      ref={containerRef}
      style={{
        height: `${canvasEditor?.height ? canvasEditor.height - HEADER_HEIGHT : 0}px`,
      }}
    />
  )
})
