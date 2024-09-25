/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { ResizableOptions } from "../../canvas/pointer_event_handlers/resize_handler"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { commitAction } from "vs/workbench/browser/haystack-frontend/canvas_utils/commit_action"
import { EditorHeader } from "vs/workbench/browser/haystack-frontend/editor/editor_header"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { useResizable } from "vs/workbench/browser/haystack-frontend/react_utils/create_resizable"
import {
  useEditorOnKeyDown,
  useEditorOnKeyDownCapture,
  useScrollHandler,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/editor_utils"
import * as React from "react"
import "vs/css!./editors"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { ViewportNumberDisplay } from "vs/workbench/browser/haystack-frontend/workspace/editors/viewport_number_display"
import { MoveOptions } from "../../canvas/pointer_event_handlers/move_handler"
import { useMoveable } from "vs/workbench/browser/haystack-frontend/react_utils/create_moveable"
import { CopilotSettingsEditor } from "vs/workbench/browser/haystack-frontend/editor/copilot_settings_editor"
import { useMemoizedCanvasBoundingBox } from "vs/workbench/browser/haystack-frontend/react_utils/memoized_canvas_bounding_box"
import { CanvasCodeEditor } from "vs/workbench/browser/haystack-frontend/editor/editor"
import { useHandleBoundsKeyDown } from "vs/workbench/browser/haystack-frontend/workspace/editors/utils/bounds_handling"
import { SmallFileSvg } from "vs/workbench/browser/haystack-frontend/workspace/editors/svgs"

interface CopilotSettingsEditorContainerProps {
  editorId: string
}

// This is a dummy container used to prevent overly re-rendering due to camera/editor
// position or dimensions changes.
export function CopilotSettingsEditorContainer({
  editorId,
}: CopilotSettingsEditorContainerProps) {
  const editorPosition = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.getEditorPosition(editorId),
  )

  const scale = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.canvasScale,
  )
  const { width, height, zIndex } = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.idToEditorMap.get(editorId) as CanvasCodeEditor,
  )
  const isSelected = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.selection.has(editorId),
  )
  const boundingBox = useMemoizedCanvasBoundingBox()

  return (
    <div
      className={classNames({
        editorDummyContainer: true,
        selected: isSelected,
      })}
      style={{
        transform: `scale(${scale})`,
        left: `${editorPosition.x + (boundingBox?.x ?? 0)}px`,
        top: `${editorPosition.y + (boundingBox?.y ?? 0)}px`,
        width,
        height,
        zIndex: isSelected ? 99 : zIndex,
      }}
    >
      <CopilotSettingsEditorContainerImpl editorId={editorId} />
    </div>
  )
}

export const CopilotSettingsEditorContainerImpl = React.memo(
  function CopilotSettingsEditorContainerImpl({
    editorId,
  }: CopilotSettingsEditorContainerProps) {
    const scale = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.canvasScale,
    )
    const selection = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.selection,
    )

    const [isHoldingModifier, isHoldingOptAlt] =
      WorkspaceStoreWrapper.useWorkspaceState((state) => [
        state.isHoldingModifier,
        state.isHoldingOptAlt,
      ])

    const [containerElement, setContainerElement] =
      React.useState<HTMLDivElement | null>(null)

    const [
      updateEditorBounds,
      closeEditor,
      deleteEditorsInSelection,
      selectEditor,
    ] = WorkspaceStoreWrapper.useWorkspaceState((state) => [
      state.updateEditorBounds,
      state.closeEditor,
      state.deleteEditorsInSelection,
      state.selectEditor,
    ])

    const containerRef = React.useCallback(
      (containerElement: HTMLDivElement) =>
        setContainerElement(containerElement),
      [],
    )

    const isSelected = React.useMemo(() => selection.has(editorId), [selection])

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
          containerElement?.focus()
        },
        onEnd: commitAction,
        onClick: (e) => {
          selectEditor(editorId, /* clearSelection */ !e.shiftKey)
          containerElement?.focus()
          commitAction()
        },
      }
    }, [isSelected, containerElement])

    useResizable(containerElement, resizeOptions)

    const handleBoundsKeyDown = useHandleBoundsKeyDown(editorId)

    const onKeyDown = useEditorOnKeyDown(
      editorId,
      containerElement,
      handleBoundsKeyDown,
      deleteEditorsInSelection,
      () => {},
    )

    const onKeyDownCapture = useEditorOnKeyDownCapture(
      deleteEditorsInSelection,
      () => {},
    )

    const onWheelCapture = useScrollHandler()

    // These need to be use callbacks to prevent unnecessary re-renders.
    const onMoveClick = React.useCallback(
      (e: MouseEvent) => {
        selectEditor(editorId, /* clearSelection */ !e.shiftKey)
        containerElement?.focus()
        commitAction()
      },
      [containerElement],
    )
    const onMoveStart = React.useCallback(
      (e: MouseEvent) => {
        selectEditor(editorId, /* clearSelection */ !e.shiftKey && !isSelected)
        containerElement?.focus()
      },
      [isSelected, containerElement],
    )

    const editorContainerRef = React.useRef<HTMLDivElement | null>(null)

    const [anEditorIsFocused, thisEditorIsFocused] =
      WorkspaceStoreWrapper.useWorkspaceState((state) => [
        state.focusedEditorId != null,
        state.focusedEditorId === editorId,
      ])

    const shouldDisplayViewportNumber = React.useMemo(() => {
      return anEditorIsFocused && !thisEditorIsFocused && isHoldingModifier
    }, [isHoldingModifier, anEditorIsFocused, thisEditorIsFocused])

    const moveOptions: MoveOptions = React.useMemo(() => {
      return {
        eventHandler: (positionDelta: Vector) => {
          updateEditorBounds(editorId, positionDelta, Vector.new())
        },
        onStart: onMoveStart,
        onEnd: commitAction,
        onClick: onMoveClick,
      }
    }, [onMoveStart, commitAction, onMoveClick])

    useMoveable(
      containerElement,
      moveOptions,
      /* useMoveBehaviorCondition */ scale <= 0.5 ||
        (isHoldingModifier && isHoldingOptAlt),
    )

    return (
      <div
        className={classNames({
          fileEditorContainer: true,
          selected: isSelected,
        })}
        ref={containerRef}
        onKeyDown={(e) => {
          if (e.target !== containerElement) {
            return
          }
          onKeyDown(e)
        }}
        onKeyDownCapture={onKeyDownCapture}
        onWheelCapture={onWheelCapture}
        onBlurCapture={(e) => {
          if (!containerElement?.contains(e.relatedTarget) ?? false) {
            if (
              WorkspaceStoreWrapper.getWorkspaceState().focusedEditorId ===
              editorId
            ) {
              WorkspaceStoreWrapper.getWorkspaceState().setFocusedEditor(null)
            }
          }
        }}
        onPointerDownCapture={(e) => {
          const editorContainsTarget = !!editorContainerRef.current?.contains(
            e.target as HTMLElement,
          )
          selectEditor(
            editorId,
            /* clearSelection */ editorContainsTarget ||
              (!isSelected && !e.shiftKey),
          )
        }}
        onFocusCapture={(e) => {
          WorkspaceStoreWrapper.getWorkspaceState().setFocusedEditor(editorId)
          const editorContainsTarget = !!editorContainerRef.current?.contains(
            e.target,
          )
          selectEditor(editorId, /* clearSelection */ editorContainsTarget)
        }}
        tabIndex={0}
      >
        <EditorHeader
          fileName={"Copilot Settings"}
          relativeFilePath={"Copilot Settings"}
          icon={<SmallFileSvg />}
          onClose={() => closeEditor(editorId)}
          onMove={(delta: Vector) => {
            updateEditorBounds(editorId, delta, new Vector(0, 0))
          }}
          isDirty={false}
          onMoveStart={onMoveStart}
          onMoveEnd={commitAction}
          onMoveClick={onMoveClick}
          editorId={editorId}
        />
        <CopilotSettingsEditor />
        {shouldDisplayViewportNumber && (
          <ViewportNumberDisplay editorId={editorId} />
        )}
      </div>
    )
  },
)
