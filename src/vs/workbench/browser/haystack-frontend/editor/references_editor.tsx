/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./file_editor"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { ReferencesModel } from "vs/editor/contrib/gotoSymbol/browser/referencesModel"
import { ICodeEditor } from "vs/editor/browser/editorBrowser"
import { IRange } from "vs/editor/common/core/range"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { HaystackReferenceWidget } from "vs/editor/contrib/gotoSymbol/browser/peek/haystackReferencesWidget"
import { useDebounce } from "vs/workbench/browser/haystack-frontend/react_utils/debounce"
import { IDisposable } from "node-pty"
import { URI } from "vs/base/common/uri"
import { HEADER_HEIGHT } from "vs/workbench/browser/haystack-frontend/editor/editor_header"

interface ReferencesEditorProps {
  editorId: string
  codeEditor: ICodeEditor
  range: IRange
  referencesModel: ReferencesModel
  currentReferenceUri: URI | null
}

export const ReferencesEditor = React.memo(function ReferencesEditor({
  editorId,
  referencesModel,
  codeEditor,
  range,
  currentReferenceUri,
}: ReferencesEditorProps) {
  const initialNumLinesRef = React.useRef<number | null>(null)
  const referencesEditorContainerRef = React.useRef<HTMLDivElement>(null)
  const widgetRef = React.useRef<HaystackReferenceWidget | null>(null)
  const disposableRef = React.useRef<IDisposable | null>(null)

  const debouncedEditLog = useDebounce(
    (cumulativeLineDelta: number) => {
      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
        `editor written to`,
        {
          editorId,
          editorType: "references",
          lineDelta: cumulativeLineDelta,
        },
      )
    },
    500,
    [],
  )

  React.useEffect(() => {
    const haystackService =
      WorkspaceStoreWrapper.getWorkspaceState().haystackService
    if (
      haystackService == null ||
      referencesEditorContainerRef.current == null
    ) {
      return
    }

    widgetRef.current =
      WorkspaceStoreWrapper.getWorkspaceState().createReferencesEditorElement(
        referencesEditorContainerRef.current,
        referencesModel,
        codeEditor,
        range,
        editorId,
      )
  }, [referencesModel, codeEditor, range])

  React.useEffect(() => {
    if (currentReferenceUri == null) return

    const model =
      WorkspaceStoreWrapper.getWorkspaceState().getTextModel(
        currentReferenceUri,
      )

    if (model == null) return

    initialNumLinesRef.current = model.getLineCount()

    disposableRef.current?.dispose()
    disposableRef.current = model.onDidChangeContent(() => {
      WorkspaceStoreWrapper.getWorkspaceState().setEditorDirty(editorId, true)

      debouncedEditLog(
        initialNumLinesRef.current != null
          ? model.getLineCount() - initialNumLinesRef.current
          : 0,
      )
    })
  }, [currentReferenceUri])

  const canvasEditor = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.idToEditorMap.get(editorId),
  )

  return (
    <div
      className={classNames({
        fileEditor: true,
        references: true,
      })}
      style={{
        height: `${canvasEditor?.height ? canvasEditor.height - HEADER_HEIGHT : 0}px`,
      }}
      ref={referencesEditorContainerRef}
    />
  )
})
