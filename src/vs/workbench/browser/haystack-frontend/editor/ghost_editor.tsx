/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./file_editor"
import { ITextModel } from "vs/editor/common/model"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { IRange } from "vs/editor/common/core/range"
import { IEditorOptions } from "vs/platform/editor/common/editor"
import { isCodeEditor } from "vs/editor/browser/editorBrowser"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { useDebounce } from "vs/workbench/browser/haystack-frontend/react_utils/debounce"
import { URI } from "vs/base/common/uri"
import { HEADER_HEIGHT } from "vs/workbench/browser/haystack-frontend/editor/editor_header"
import { getMaxColumn } from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import { CanvasGhostEditor } from "vs/workbench/browser/haystack-frontend/editor/editor"

interface GhostEditorProps {
  filePath: string
  uri: URI
  editorId: string
  modelRef: React.MutableRefObject<ITextModel | null>
  value: string
  isGhost: boolean
  editRange: IRange | null
  options: IEditorOptions | null
  editorContainerRef: React.RefObject<HTMLDivElement>
}

export const GhostEditor = React.memo(function GhostEditor({
  filePath,
  uri,
  editorId,
  modelRef,
  value,
  isGhost,
  editRange,
  options,
  editorContainerRef,
}: GhostEditorProps) {
  // Note we don't default to null because we care about the initial state.
  const wasGhost = React.useRef<boolean>(isGhost)

  const manifested = React.useRef<boolean>(false)

  const initialNumLinesRef = React.useRef<number | null>(null)
  const numLinesRef = React.useRef<number | null>(null)
  const maxColumnRef = React.useRef<number | null>(null)

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
      editorType: "ghost",
    }
  }

  const manifestGhostEditor = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.manifestGhostEditor,
  )

  const selectionRangeRef = React.useRef<IRange | null>(null)

  const onSelectionChange = React.useCallback(
    (selectionRange: IRange | null) => {
      selectionRangeRef.current = selectionRange
    },
    [],
  )

  React.useEffect(() => {
    // Async function.
    async function openGhostEditor() {
      if (editorContainerRef.current == null) return

      const isRust = filePath.endsWith(".rs")

      await WorkspaceStoreWrapper.getWorkspaceState().openGhostEditorForCanvasEditor(
        editorId,
        uri,
        `/scratchpad/${editorId}${filePath}${isRust ? ".txt" : ""}`,
        editorContainerRef.current,
        value,
        editRange,
      )

      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
        "editor opened",
        getProperties(),
      )
      modelRef.current =
        WorkspaceStoreWrapper.getWorkspaceState().getTextModel(uri)

      WorkspaceStoreWrapper.getWorkspaceState().addSelectionListener(
        editorId,
        onSelectionChange,
      )
    }

    // Async function.
    async function openCodeEditor() {
      // Cleans up previous state, if it exists.
      if (!isGhost && wasGhost.current) {
        await WorkspaceStoreWrapper.getWorkspaceState().removeEditorForEditor(
          editorId,
        )
      }

      if (editorContainerRef.current == null) return
      // Remove all old children.
      for (const child of editorContainerRef.current!.children) {
        editorContainerRef.current!.removeChild(child)
      }

      // Update model before opening.
      modelRef.current =
        await WorkspaceStoreWrapper.getWorkspaceState().getOrCreateModel(uri)
      // If we couldn't find or create a model return.
      if (modelRef.current == null) return

      if (editRange == null) return

      const indent = modelRef.current.getLineIndentColumn(
        editRange.startLineNumber,
      )
      const tabSize = modelRef.current.getOptions().tabSize

      const valueByLine = value.split("\n")
      const endValues: string[] = []

      for (
        let valueLineIndex = 0;
        valueLineIndex < valueByLine.length;
        ++valueLineIndex
      ) {
        let value = ""

        // We want to skip the last line, since it's irrelevant
        // for indentation and will likely cause the last line to be
        // improperly indented.
        if (valueLineIndex < valueByLine.length - 1) {
          for (let i = 0; i < indent; ++i) {
            for (let j = 0; j < tabSize; ++j) {
              value += " "
            }
          }
        }

        value += valueByLine[valueLineIndex]
        endValues.push(value)
      }

      const finalValue = modelRef.current.normalizeIndentation(
        endValues.join("\n"),
      )

      modelRef.current.pushEditOperations(
        [],
        [
          {
            range: {
              startLineNumber: editRange.startLineNumber,
              startColumn: editRange.startColumn,
              endLineNumber: editRange.startLineNumber,
              endColumn: editRange.startColumn,
            },
            text: finalValue,
          },
        ],
        () => [],
      )

      // The plus one here accounts for the newline inserted before.
      WorkspaceStoreWrapper.getWorkspaceState().setSelectionRange(
        editorId,
        selectionRangeRef.current
          ? selectionRangeRef.current
          : {
              startLineNumber: editRange.startLineNumber + 1,
              startColumn: editRange.startColumn,
              endLineNumber: editRange.startLineNumber + 1,
              endColumn: editRange.startColumn,
            },
      )

      await WorkspaceStoreWrapper.getWorkspaceState().openCodeEditorForCanvasEditor(
        editorId,
        editorContainerRef.current!,
      )

      WorkspaceStoreWrapper.getWorkspaceState().dirtyModel(editorId)

      initialNumLinesRef.current = modelRef.current.getLineCount()

      modelRef.current?.onDidChangeContent(() => {
        const canvasEditor =
          WorkspaceStoreWrapper.getWorkspaceState().idToEditorMap.get(
            editorId,
          ) as CanvasGhostEditor | undefined
        if (canvasEditor == null) return
        const editor = canvasEditor.identifier?.editor
        if (editor == null) return

        WorkspaceStoreWrapper.getWorkspaceState().setEditorDirty(
          editorId,
          editor.isDirty(),
        )
        debouncedEditLog(
          initialNumLinesRef.current != null && modelRef.current != null
            ? modelRef.current.getLineCount() - initialNumLinesRef.current
            : 0,
        )
      })
    }

    async function openFileEditor() {
      if (editorContainerRef.current == null) return

      // Remove all old children.
      for (const child of editorContainerRef.current!.children) {
        editorContainerRef.current!.removeChild(child)
      }

      await WorkspaceStoreWrapper.getWorkspaceState().openCodeEditorForCanvasEditor(
        editorId,
        editorContainerRef.current,
        options ?? undefined,
      )

      modelRef.current =
        WorkspaceStoreWrapper.getWorkspaceState().getTextModel(uri)
      modelRef.current?.onDidChangeContent((e) => {
        const canvasEditor =
          WorkspaceStoreWrapper.getWorkspaceState().idToEditorMap.get(
            editorId,
          ) as CanvasGhostEditor | undefined
        if (canvasEditor == null) return
        const editor = canvasEditor.identifier?.editor
        if (editor == null) return

        // Check if the editor should resize in height.
        if (isCodeEditor(editor)) {
          const editRange = editor.getEditRange()

          let numLines: number
          if (editRange == null) {
            numLines = modelRef.current!.getLineCount()
          } else {
            numLines = editRange.endLineNumber - editRange.startLineNumber
          }

          let maxColumn = 0
          if (modelRef.current != null) {
            for (const change of e.changes) {
              maxColumn = Math.max(
                maxColumn,
                getMaxColumn(modelRef.current!, change.range),
              )
            }
          }

          WorkspaceStoreWrapper.getWorkspaceState().updateEditorSize(
            editorId,
            numLines,
            maxColumn,
          )

          // Check if the editor should resize in width or height.
          if (
            canvasEditor.identifier != null &&
            modelRef.current &&
            ((numLinesRef.current != null &&
              numLinesRef.current !== modelRef.current.getLineCount()) ||
              (maxColumnRef.current != null &&
                maxColumnRef.current < maxColumn))
          ) {
            numLinesRef.current = modelRef.current.getLineCount()
            maxColumnRef.current = Math.max(
              maxColumn,
              maxColumnRef.current ?? 0,
            )

            let numLines: number
            if (editRange == null) {
              numLines = modelRef.current!.getLineCount() + 1
            } else {
              numLines = editRange.endLineNumber - editRange.startLineNumber + 1
            }

            WorkspaceStoreWrapper.getWorkspaceState().updateEditorSize(
              editorId,
              numLines,
              maxColumn,
            )
          }
        }

        WorkspaceStoreWrapper.getWorkspaceState().setEditorDirty(
          editorId,
          editor.isDirty(),
        )
      })
    }

    if (isGhost) {
      openGhostEditor()
    } else if (wasGhost.current) {
      WorkspaceStoreWrapper.getWorkspaceState().setShouldRespondToCloseEvents(
        editorId,
        false,
      )
      openCodeEditor()
    } else {
      WorkspaceStoreWrapper.getWorkspaceState().setShouldRespondToCloseEvents(
        editorId,
        false,
      )
      openFileEditor()
    }
  }, [filePath, isGhost, value, editRange])

  // Note that this use effect will always run AFTER the previous one.
  React.useEffect(() => {
    wasGhost.current = isGhost
  }, [isGhost])

  const canvasEditor = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.idToEditorMap.get(editorId),
  )

  return (
    <div
      ref={editorContainerRef}
      className={classNames({
        fileEditor: true,
      })}
      style={{
        height: `${canvasEditor?.height ? canvasEditor.height - HEADER_HEIGHT : 0}px`,
      }}
      onFocusCapture={() => {
        if (!manifested.current) {
          WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
            "ghost editor manifested",
            getProperties(),
          )
          manifested.current = true
          manifestGhostEditor(editorId)
        }
      }}
    />
  )
})
