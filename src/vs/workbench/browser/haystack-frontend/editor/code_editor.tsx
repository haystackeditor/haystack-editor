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
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { useDebounce } from "vs/workbench/browser/haystack-frontend/react_utils/debounce"
import { getMaxColumn } from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import { IDisposable, IReference } from "vs/base/common/lifecycle"
import { KeyCode } from "vs/workbench/browser/haystack-frontend/canvas/keyboard_constants"
import { isModifierKeypressed } from "vs/workbench/browser/haystack-frontend/react_utils/platform"
import { ITextFileEditorModel } from "vs/workbench/services/textfile/common/textfiles"
import { URI } from "vs/base/common/uri"
import { HEADER_HEIGHT } from "vs/workbench/browser/haystack-frontend/editor/editor_header"
import { CanvasCodeEditor } from "vs/workbench/browser/haystack-frontend/editor/editor"

interface FileEditorProps {
  uri: URI
  editRange: IRange | null
  editorId: string
  setModel: (model: ITextModel | null) => void
  options: IEditorOptions | null
  editorContainerRef: React.MutableRefObject<HTMLDivElement | null>
  onSelectionChange: (range: IRange | null) => void
}

export const CodeEditor = React.memo(function CodeEditor({
  uri,
  editRange,
  editorId,
  setModel,
  options,
  editorContainerRef,
  onSelectionChange,
}: FileEditorProps) {
  const [refreshCodeEditorToggle, setRefreshCodeEditorToggle] =
    React.useState<boolean>(false)
  // Super hacky, but we need this to ensure the editor doesn't close
  // and prompt the user to save when closing.
  const refreshedCodeEditorModelRef: React.MutableRefObject<IReference<ITextFileEditorModel> | null> =
    React.useRef(null)
  const initialNumLinesRef = React.useRef<number | null>(null)
  const numLinesRef = React.useRef<number | null>(null)
  const maxColumnRef = React.useRef<number | null>(null)
  const onDidChangeDisposableRef = React.useRef<IDisposable | null>(null)
  const selectionListenerDisposableRef = React.useRef<IDisposable | null>(null)

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
      editorType: options?.range ? "symbol" : "file",
    }
  }

  React.useEffect(() => {
    // Async function.
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

      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
        "editor opened",
        getProperties(),
      )

      const model = WorkspaceStoreWrapper.getWorkspaceState().getTextModel(uri)
      setModel(model)

      initialNumLinesRef.current = model?.getLineCount() ?? null
      numLinesRef.current = model?.getLineCount() ?? null

      if (model != null) {
        maxColumnRef.current = getMaxColumn(model, editRange ?? undefined)
      }

      onDidChangeDisposableRef.current =
        model?.onDidChangeContent((e) => {
          const canvasEditor =
            WorkspaceStoreWrapper.getWorkspaceState().idToEditorMap.get(
              editorId,
            ) as CanvasCodeEditor | undefined
          if (canvasEditor == null) return

          const editor = canvasEditor.identifier?.editor
          if (editor == null) return

          let maxColumn = 0
          for (const change of e.changes) {
            maxColumn = Math.max(maxColumn, getMaxColumn(model, change.range))
          }

          // Check if the editor should resize in width or height.
          if (
            canvasEditor.identifier != null &&
            ((numLinesRef.current != null &&
              numLinesRef.current !== model?.getLineCount()) ||
              (maxColumnRef.current != null &&
                maxColumnRef.current < maxColumn))
          ) {
            maxColumnRef.current = Math.max(
              maxColumn,
              maxColumnRef.current ?? 0,
            )
            numLinesRef.current = model.getLineCount()

            let numLines: number
            if (editRange == null) {
              numLines = model!.getLineCount() + 1
            } else {
              numLines = editRange.endLineNumber - editRange.startLineNumber + 1
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
            initialNumLinesRef.current != null
              ? model.getLineCount() - initialNumLinesRef.current
              : 0,
          )
        }) ?? null

      selectionListenerDisposableRef.current =
        WorkspaceStoreWrapper.getWorkspaceState().addSelectionListener(
          editorId,
          onSelectionChange,
        )
    }

    openFileEditor()

    return () => {
      onDidChangeDisposableRef.current?.dispose()
      selectionListenerDisposableRef.current?.dispose()
    }
  }, [uri, editRange, options, refreshCodeEditorToggle])

  React.useEffect(() => {
    return () => {
      refreshedCodeEditorModelRef.current?.dispose()
    }
  })

  const canvasEditor = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.idToEditorMap.get(editorId),
  )

  return (
    <div
      className={classNames({
        fileEditor: true,
        modal: uri.scheme === "walkThrough",
      })}
      style={{
        height: `${
          canvasEditor?.isPinned
            ? canvasEditor.vHeight - HEADER_HEIGHT
            : canvasEditor?.height
              ? canvasEditor.height - HEADER_HEIGHT
              : 0
        }px`,
      }}
      ref={editorContainerRef}
      onKeyDownCapture={async (e) => {
        if (e.code === KeyCode.R && isModifierKeypressed(e.nativeEvent)) {
          e.preventDefault()
          e.stopPropagation()

          // Close the current editor and reopen.
          const canvasEditor =
            WorkspaceStoreWrapper.getWorkspaceState().idToEditorMap.get(
              editorId,
            ) as CanvasCodeEditor | null

          if (canvasEditor == null || canvasEditor.identifier == null) return

          // Closes the current editor and reopens a new one.
          WorkspaceStoreWrapper.getWorkspaceState().setShouldRespondToCloseEvents(
            editorId,
            false,
          )

          // Store the model so the user is not prompted with a save dialog.
          refreshedCodeEditorModelRef.current?.dispose()
          refreshedCodeEditorModelRef.current =
            await WorkspaceStoreWrapper.getWorkspaceState().getTextModelRef(
              canvasEditor.uri,
            )
          await Promise.all([
            WorkspaceStoreWrapper.getWorkspaceState().closeFileEditor(
              canvasEditor.identifier,
            ),
            await WorkspaceStoreWrapper.getWorkspaceState().refreshEditRange(
              editorId,
            ),
          ])

          setRefreshCodeEditorToggle(!refreshCodeEditorToggle)
        }
      }}
    />
  )
})
