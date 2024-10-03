/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import {
  useEditorOnKeyDownCapture,
  useScrollHandler,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/editor_utils"
import * as React from "react"
import "vs/css!./editors"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { ReferencesEditor } from "vs/workbench/browser/haystack-frontend/editor/references_editor"
import { KeyCode } from "vs/workbench/browser/haystack-frontend/canvas/keyboard_constants"
import { EditorHeader } from "vs/workbench/browser/haystack-frontend/editor/editor_header"
import { SmallFileSvg } from "vs/workbench/browser/haystack-frontend/workspace/editors/svgs"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { commitAction } from "vs/workbench/browser/haystack-frontend/canvas_utils/commit_action"
import { ResizableOptions } from "../../canvas/pointer_event_handlers/resize_handler"
import { useResizable } from "vs/workbench/browser/haystack-frontend/react_utils/create_resizable"
import { useHandleBoundsKeyDown } from "vs/workbench/browser/haystack-frontend/workspace/editors/utils/bounds_handling"
import { focusOnPixiCanvas } from "vs/workbench/browser/haystack-frontend/canvas_utils/focus_on_pixi_canvas"
import { isModifierKeypressed } from "vs/workbench/browser/haystack-frontend/react_utils/platform"
import { useMemoizedCanvasBoundingBox } from "vs/workbench/browser/haystack-frontend/react_utils/memoized_canvas_bounding_box"
import { CanvasReferencesEditor } from "vs/workbench/browser/haystack-frontend/editor/editor"

interface ReferencesEditorContainerProps {
  editorId: string
}

export function ReferencesEditorContainer({
  editorId,
}: ReferencesEditorContainerProps) {
  const { xPosition, yPosition, width, height, referencesWidget } =
    WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.idToEditorMap.get(editorId) as CanvasReferencesEditor,
    )

  const boundingBox = useMemoizedCanvasBoundingBox()

  const isSelected = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.selection.has(editorId),
  )

  React.useEffect(() => {
    referencesWidget?.layout(width, height)
  }, [referencesWidget, width, height])

  return (
    boundingBox != null &&
    boundingBox != null && (
      <div
        className={classNames({
          editorDummyContainer: true,
          selected: isSelected,
        })}
        style={{
          // Needed to properly position descendant elements
          // with position fixed e.g. hover widget.
          transform: `scale(1)`,
          left: `${xPosition + (boundingBox?.x ?? 0)}px`,
          top: `${yPosition + (boundingBox?.y ?? 0)}px`,
          width,
          height,
          zIndex: 100,
        }}
      >
        <ReferencesEditorContainerImpl editorId={editorId} />
      </div>
    )
  )
}

export const ReferencesEditorContainerImpl = React.memo(
  function ReferencesEditorContainerImpl({
    editorId,
  }: ReferencesEditorContainerProps) {
    const rootDirNameLen = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.getWorkspacePath()?.length,
    )

    const editor = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.idToEditorMap.get(editorId) as CanvasReferencesEditor,
    )

    const { referencesModel, codeEditor, range, currentReferenceUri, isDirty } =
      editor

    const isSelected = WorkspaceStoreWrapper.useWorkspaceState((state) =>
      state.selection.has(editorId),
    )

    const [
      selectEditor,
      updateEditorBounds,
      deleteEditorsInSelection,
      closeReferenceEditor,
    ] = WorkspaceStoreWrapper.useWorkspaceState((state) => [
      state.selectEditor,
      state.updateEditorBounds,
      state.deleteEditorsInSelection,
      state.closeReferencesEditor,
    ])

    const onWheelCapture = useScrollHandler()

    const referencesContainerRef = React.useRef<HTMLDivElement | null>(null)

    const resizeOptions: ResizableOptions = React.useMemo(() => {
      return {
        edges: { left: true, right: true, bottom: true, top: true },
        margin: 5,
        eventHandler: (event) => {
          const { positionDelta, sizeDelta } = event
          WorkspaceStoreWrapper.getWorkspaceState().updateEditorBounds(
            editorId,
            positionDelta,
            sizeDelta,
          )
        },
        restriction: {
          min: {
            width: 50,
            height: 50,
          },
        },
        onStart: (e) => {
          selectEditor(
            editorId,
            /* clearSelection */ !e.shiftKey && !isSelected,
          )
          referencesContainerRef.current?.focus()
        },
        onEnd: commitAction,
        onClick: (e) => {
          selectEditor(editorId, /* clearSelection */ !e.shiftKey)
          referencesContainerRef.current?.focus()
          commitAction()
        },
      }
    }, [isSelected])

    useResizable(referencesContainerRef.current, resizeOptions)

    React.useEffect(() => {
      selectEditor(editorId, /* clearSelection */ true)
    }, [])

    const editorOnKeyDownCapture = useEditorOnKeyDownCapture(
      () => closeReferenceEditor(editorId, codeEditor),
      () => {},
    )

    const handleBoundsKeyDown = useHandleBoundsKeyDown(editorId)
    const lastPressedKeyWasEscape = React.useRef(false)

    const onKeyDown = React.useCallback((e: React.KeyboardEvent) => {
      const isTyping = (e.target as HTMLElement).tagName === "TEXTAREA"

      if (
        e.target === referencesContainerRef.current &&
        handleBoundsKeyDown(e)
      ) {
        return
      }

      switch (e.code) {
        case KeyCode.DELETE:
        case KeyCode.BACKSPACE: {
          if (!isTyping) {
            deleteEditorsInSelection()
            commitAction()
            focusOnPixiCanvas()
          }
          break
        }
      }
    }, [])

    const onKeyDownCapture = React.useCallback(
      (e: React.KeyboardEvent) => {
        const isTyping = (e.target as HTMLElement).tagName === "TEXTAREA"

        switch (e.code) {
          case KeyCode.ESCAPE: {
            if (lastPressedKeyWasEscape.current || !isTyping) {
              closeReferenceEditor(editorId, codeEditor)
            }

            // We return here to prevent resetting the lastPressedKeyWasEscape.
            break
          }
          // case KeyCode.S: {
          //   if (isModifierKeypressed(e.nativeEvent)) {
          //     const model = codeEditor.getModel()
          //     if (model == null || currentReferenceUri == null) return
          //     WorkspaceStoreWrapper.getWorkspaceState().saveReferenceEditor(
          //       currentReferenceUri,
          //     )
          //     e.preventDefault()
          //     e.stopPropagation()
          //   }
          //   break
          // }
          default:
            editorOnKeyDownCapture(e)
            break
        }

        lastPressedKeyWasEscape.current = e.code === KeyCode.ESCAPE
      },
      [codeEditor],
    )

    const fileName = React.useMemo(() => {
      if (currentReferenceUri == null) return null
      const dirs = currentReferenceUri.path.split("/")
      return dirs[dirs.length - 1]
    }, [currentReferenceUri])

    const relativeFilePath = React.useMemo(() => {
      if (currentReferenceUri == null) return null
      return rootDirNameLen == null
        ? currentReferenceUri.path
        : currentReferenceUri.path.substring(rootDirNameLen)
    }, [currentReferenceUri])

    // These need to be use callbacks to prevent unnecessary re-renders.
    const onMoveClick = React.useCallback((e: MouseEvent) => {
      selectEditor(editorId, /* clearSelection */ !e.shiftKey)
      referencesContainerRef.current?.focus()
      commitAction()
    }, [])

    const onMoveStart = React.useCallback(
      (e: MouseEvent) => {
        selectEditor(editorId, /* clearSelection */ !e.shiftKey && !isSelected)
        referencesContainerRef.current?.focus()
      },
      [isSelected],
    )

    return (
      <div
        className={classNames({
          referencesEditorContainer: true,
          selected: isSelected,
        })}
        ref={referencesContainerRef}
        onKeyDown={onKeyDown}
        onKeyDownCapture={onKeyDownCapture}
        onWheelCapture={onWheelCapture}
        tabIndex={0}
        onFocusCapture={(e) => {
          const editorContainsTarget =
            !!referencesContainerRef.current?.contains(e.target)
          WorkspaceStoreWrapper.getWorkspaceState().setFocusedEditor(editorId)
          WorkspaceStoreWrapper.getWorkspaceState().selectEditor(
            editorId,
            /* clearSelection */ editorContainsTarget,
          )
        }}
      >
        {fileName && relativeFilePath && (
          <EditorHeader
            fileName={fileName}
            relativeFilePath={relativeFilePath}
            icon={<SmallFileSvg />}
            onClose={() => closeReferenceEditor(editorId, codeEditor)}
            onMoveStart={onMoveStart}
            onMoveClick={onMoveClick}
            onMoveEnd={commitAction}
            onMove={(delta: Vector) => {
              updateEditorBounds(editorId, delta, new Vector(0, 0))
            }}
            isDirty={isDirty}
            editorId={editorId}
          />
        )}
        <ReferencesEditor
          currentReferenceUri={currentReferenceUri}
          editorId={editorId}
          referencesModel={referencesModel}
          codeEditor={codeEditor}
          range={range}
        />
      </div>
    )
  },
)
