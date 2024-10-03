/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./file_editor"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { IRange } from "vs/editor/common/core/range"
import { IEditorOptions } from "vs/platform/editor/common/editor"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { HEADER_HEIGHT } from "vs/workbench/browser/haystack-frontend/editor/editor_header"
import { IResourceMergeEditorInput } from "vs/workbench/common/editor"

interface MergeEditorProps {
  input: IResourceMergeEditorInput
  selectionRange: IRange | null
  editorId: string
  options: IEditorOptions | null
}

export const MergeEditor = React.memo(function MergeEditor({
  input,
  editorId,
  options,
}: MergeEditorProps) {
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
    async function openMergeEditor() {
      if (containerRef.current == null) return

      // Remove all old children.
      for (const child of containerRef.current!.children) {
        containerRef.current!.removeChild(child)
      }

      await WorkspaceStoreWrapper.getWorkspaceState().openMergeEditorForCanvasEditor(
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

    openMergeEditor()
  }, [input, options])

  const canvasEditor = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.idToEditorMap.get(editorId),
  )

  const editorHeight = React.useMemo(() => {
    if (canvasEditor == null) return 0
    return canvasEditor.isPinned
      ? canvasEditor.vHeight - HEADER_HEIGHT - 2
      : canvasEditor.height - HEADER_HEIGHT - 2
  }, [canvasEditor])

  return (
    <div
      className={classNames({
        fileEditor: true,
        modal: true,
      })}
      ref={containerRef}
      style={{
        height: `${editorHeight}px`,
      }}
    />
  )
})
