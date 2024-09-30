/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { ResizableOptions } from "../../canvas/pointer_event_handlers/resize_handler"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { commitAction } from "vs/workbench/browser/haystack-frontend/canvas_utils/commit_action"
import { DiffEditor } from "vs/workbench/browser/haystack-frontend/editor/diff_editor"
import { EditorHeader } from "vs/workbench/browser/haystack-frontend/editor/editor_header"
import { useGlobalState } from "vs/workbench/browser/haystack-frontend/global_state/global_store"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { useResizable } from "vs/workbench/browser/haystack-frontend/react_utils/create_resizable"
import { extractFileNameFromPath } from "vs/workbench/browser/haystack-frontend/react_utils/extract_name_from_path"
import {
  useEditorOnKeyDown,
  useEditorOnKeyDownCapture,
  useScrollHandler,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/editor_utils"
import * as React from "react"
import "vs/css!./editors"
import { IDiffEditorModel } from "vs/editor/common/editorCommon"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { ViewportNumberDisplay } from "vs/workbench/browser/haystack-frontend/workspace/editors/viewport_number_display"
import { MoveOptions } from "../../canvas/pointer_event_handlers/move_handler"
import { useMoveable } from "vs/workbench/browser/haystack-frontend/react_utils/create_moveable"
import { useMemoizedCanvasBoundingBox } from "vs/workbench/browser/haystack-frontend/react_utils/memoized_canvas_bounding_box"
import { CanvasDiffEditor } from "vs/workbench/browser/haystack-frontend/editor/editor"
import { useHandleBoundsKeyDown } from "vs/workbench/browser/haystack-frontend/workspace/editors/utils/bounds_handling"
import { SmallFileSvg } from "vs/workbench/browser/haystack-frontend/workspace/editors/svgs"

interface DiffEditorContainerProps {
  editorId: string
}

// This is a dummy container used to prevent overly re-rendering due to camera/editor
// position or dimensions changes.
export function DiffEditorContainer({ editorId }: DiffEditorContainerProps) {
  const editorPosition = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.getEditorPosition(editorId),
  )

  const scale = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.canvasScale,
  )
  const { width, height, vWidth, vHeight, zIndex, isPinned } =
    WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.idToEditorMap.get(editorId) as CanvasDiffEditor,
    )
  const isSelected = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.selection.has(editorId),
  )

  const boundingBox = useMemoizedCanvasBoundingBox()

  return (
    boundingBox != null && (
      <div
        className={classNames({
          editorDummyContainer: true,
          selected: isSelected,
        })}
        style={{
          transform: `scale(${isPinned ? 1.0 : scale})`,
          left: `${editorPosition.x + (boundingBox?.x ?? 0)}px`,
          top: `${editorPosition.y + (boundingBox?.y ?? 0)}px`,
          width: `${isPinned ? vWidth : width}px`,
          height: `${isPinned ? vHeight : height}px`,
          zIndex: isPinned ? 100 : isSelected ? 99 : zIndex,
        }}
      >
        <DiffEditorContainerImpl editorId={editorId} />
      </div>
    )
  )
}

export const DiffEditorContainerImpl = React.memo(
  function DiffEditorContainerImpl({ editorId }: DiffEditorContainerProps) {
    const rootDirNameLen = useGlobalState((state) => state.rootDirName.length)
    const scale = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.canvasScale,
    )
    const selection = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.selection,
    )
    const [containerElement, setContainerElement] =
      React.useState<HTMLDivElement | null>(null)
    const {
      selectionRange,
      filePath,
      isDirty,
      isGhost,
      options,
      identifier,
      isPinned,
    } = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.idToEditorMap.get(editorId) as CanvasDiffEditor,
    )

    const isSelected = React.useMemo(() => selection.has(editorId), [selection])

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

    const fileName = extractFileNameFromPath(filePath)

    const relativeFilePath = filePath.substring(rootDirNameLen)

    const containerRef = React.useCallback(
      (containerElement: HTMLDivElement) => {
        WorkspaceStoreWrapper.getWorkspaceState().setEditorContainer(
          editorId,
          containerElement,
        )
        setContainerElement(containerElement)
      },
      [],
    )

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
    }, [isSelected])

    useResizable(containerElement, resizeOptions)

    const handleBoundsKeyDown = useHandleBoundsKeyDown(editorId)

    const saveEditor = React.useCallback(() => {
      if (identifier == null) return
      WorkspaceStoreWrapper.getWorkspaceState().saveEditor(identifier)
    }, [identifier])

    const onKeyDown = useEditorOnKeyDown(
      editorId,
      containerElement,
      handleBoundsKeyDown,
      deleteEditorsInSelection,
      saveEditor,
    )

    const onKeyDownCapture = useEditorOnKeyDownCapture(
      deleteEditorsInSelection,
      saveEditor,
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

    React.useEffect(() => {
      const listener =
        WorkspaceStoreWrapper.getWorkspaceState().addOnDidSaveListener(() => {
          WorkspaceStoreWrapper.getWorkspaceState().setEditorDirty(
            editorId,
            false,
          )
        })

      return () => {
        listener?.dispose()
      }
    })

    const modelRef: React.MutableRefObject<IDiffEditorModel | null> =
      React.useRef(null)

    const thisEditorIsFocused = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.focusedEditorId === editorId,
    )

    const isHoldingModifier = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.isHoldingModifier,
    )

    const shouldDisplayViewportNumber = React.useMemo(() => {
      return !thisEditorIsFocused && isHoldingModifier
    }, [isHoldingModifier, thisEditorIsFocused])

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
      /* useMoveBehaviorCondition */ scale <= 0.5,
    )

    const editorContainerRef = React.useRef<HTMLDivElement>(null)

    return (
      <div
        className={classNames({
          fileEditorContainer: true,
          selected: isSelected,
          ghost: isGhost,
          pinned: isPinned,
        })}
        ref={containerRef}
        onFocusCapture={(e) => {
          WorkspaceStoreWrapper.getWorkspaceState().setFocusedEditor(editorId)
          if (editorContainerRef.current?.contains(e.target)) {
            WorkspaceStoreWrapper.getWorkspaceState().panToFocusedEditor(
              editorId,
            )
          }
          selectEditor(editorId, /* clearSelection */ true)
        }}
        onBlurCapture={(e) => {
          if (
            (containerElement?.contains(e.relatedTarget) ?? false) &&
            !WorkspaceStoreWrapper.getWorkspaceState().floatingToolbarElement?.contains(
              e.relatedTarget,
            )
          ) {
            if (
              WorkspaceStoreWrapper.getWorkspaceState().focusedEditorId ===
              editorId
            ) {
              WorkspaceStoreWrapper.getWorkspaceState().setFocusedEditor(null)
            }
          }
        }}
        onKeyDown={(e) => {
          if (e.target !== containerElement) {
            return
          }
          onKeyDown(e)
        }}
        onKeyDownCapture={onKeyDownCapture}
        onWheelCapture={onWheelCapture}
        tabIndex={0}
      >
        <EditorHeader
          fileName={fileName ?? ""}
          relativeFilePath={relativeFilePath}
          icon={<SmallFileSvg />}
          onClose={() => closeEditor(editorId)}
          onMove={(delta: Vector) => {
            updateEditorBounds(editorId, delta, new Vector(0, 0))
          }}
          isDirty={isDirty}
          onMoveStart={onMoveStart}
          onMoveEnd={commitAction}
          onMoveClick={onMoveClick}
          editorId={editorId}
        />
        <DiffEditor
          filePath={filePath}
          selectionRange={selectionRange}
          editorId={editorId}
          modelRef={modelRef}
          options={options}
          editorContainerRef={editorContainerRef}
        />
        {shouldDisplayViewportNumber && (
          <ViewportNumberDisplay editorId={editorId} />
        )}
      </div>
    )
  },
  compareProps,
)

function compareProps(
  { editorId: previouseditorId }: DiffEditorContainerProps,
  { editorId: nexteditorId }: DiffEditorContainerProps,
) {
  return previouseditorId === nexteditorId
}
