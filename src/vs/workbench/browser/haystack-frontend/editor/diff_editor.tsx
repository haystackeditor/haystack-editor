/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./file_editor"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { IRange } from "vs/editor/common/core/range"
import { IDiffEditor, IDiffEditorModel } from "vs/editor/common/editorCommon"
import { IEditorOptions } from "vs/platform/editor/common/editor"
import { isDiffEditor } from "vs/editor/browser/editorBrowser"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { useDebounce } from "vs/workbench/browser/haystack-frontend/react_utils/debounce"
import { HEADER_HEIGHT } from "vs/workbench/browser/haystack-frontend/editor/editor_header"
import { getMaxColumn } from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import { CanvasDiffEditor } from "vs/workbench/browser/haystack-frontend/editor/editor"

interface DiffEditorProps {
  filePath: string
  selectionRange: IRange | null
  editorId: string
  modelRef: React.MutableRefObject<IDiffEditorModel | null>
  options: IEditorOptions | null
  editorContainerRef: React.RefObject<HTMLDivElement>
}

export const DiffEditor = React.memo(function DiffEditor({
  filePath,
  editorId,
  modelRef,
  options,
  editorContainerRef,
}: DiffEditorProps) {
  const initialNumLinesRef = React.useRef<number | null>(null)

  const debouncedEditLog = useDebounce(
    (cumulativeLineDelta: number) => {
      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
        `editor written to`,
        {
          ...getProperties(),
          lineDelta: cumulativeLineDelta,
        },
      )
    },
    500,
    [],
  )

  function getProperties() {
    return {
      editorId: editorId,
      editorType: "diff",
    }
  }

  React.useEffect(() => {
    // Async function.
    async function openFileEditor() {
      if (editorContainerRef.current == null) return
      const textDiffEditor =
        await WorkspaceStoreWrapper.getWorkspaceState().openFileDiffEditorForCanvasEditor(
          editorId,
          editorContainerRef.current,
          options ?? undefined,
        )

      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
        "editor opened",
        getProperties(),
      )

      const diffEditor = textDiffEditor?.getControl()! as
        | IDiffEditor
        | undefined
      modelRef.current = diffEditor?.getModel() ?? null
      initialNumLinesRef.current =
        modelRef.current?.modified.getLineCount() ?? null

      modelRef.current?.modified.onDidChangeContent((e) => {
        const canvasEditor =
          WorkspaceStoreWrapper.getWorkspaceState().idToEditorMap.get(
            editorId,
          ) as CanvasDiffEditor | undefined
        if (canvasEditor == null) return
        const editor = canvasEditor.identifier?.editor
        if (editor == null) return

        // Check if the editor should resize in height.
        if (isDiffEditor(editor) && modelRef.current != null) {
          // const editRange = editor.getEditRange()

          let numLines: number
          // if (editRange == null) {
          numLines = modelRef.current.modified.getLineCount()
          // } else {
          // numLines = editRange.endLineNumber - editRange.startLineNumber
          // }

          let maxColumn = 0
          for (const change of e.changes) {
            maxColumn = Math.max(
              maxColumn,
              getMaxColumn(modelRef.current.modified, change.range),
            )
          }

          WorkspaceStoreWrapper.getWorkspaceState().updateEditorSize(
            editorId,
            numLines,
            maxColumn,
          )
        }

        WorkspaceStoreWrapper.getWorkspaceState().setEditorDirty(
          editorId,
          editor.isDirty(),
        )
        debouncedEditLog(
          initialNumLinesRef.current != null &&
            modelRef.current?.modified != null
            ? modelRef.current.modified.getLineCount() -
                initialNumLinesRef.current
            : 0,
        )
      })
    }

    openFileEditor()

    return () => {}
  }, [filePath])

  const editor = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.idToEditorMap.get(editorId),
  )

  return (
    <div
      className={classNames({
        fileEditor: true,
      })}
      style={{
        height: `${editor?.height ? editor.height - HEADER_HEIGHT : 0}px`,
      }}
      ref={editorContainerRef}
    />
  )
})
