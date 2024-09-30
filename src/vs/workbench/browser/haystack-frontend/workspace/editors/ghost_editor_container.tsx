/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

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
import { useHandleBoundsKeyDown } from "vs/workbench/browser/haystack-frontend/workspace/editors/utils/bounds_handling"
import * as React from "react"
import { ITextModel } from "vs/editor/common/model"
import "vs/css!./editors"
import { GhostEditor } from "vs/workbench/browser/haystack-frontend/editor/ghost_editor"
import { getSymbolIcon } from "vs/workbench/browser/haystack-frontend/workspace/editors/utils/get_symbol_icon"
import { ResizableOptions } from "../../canvas/pointer_event_handlers/resize_handler"
import { SmallFileSvg } from "vs/workbench/browser/haystack-frontend/workspace/editors/svgs"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { ViewportNumberDisplay } from "vs/workbench/browser/haystack-frontend/workspace/editors/viewport_number_display"
import { MoveOptions } from "../../canvas/pointer_event_handlers/move_handler"
import { useMoveable } from "vs/workbench/browser/haystack-frontend/react_utils/create_moveable"
import { useMemoizedCanvasBoundingBox } from "vs/workbench/browser/haystack-frontend/react_utils/memoized_canvas_bounding_box"
import { CanvasGhostEditor } from "vs/workbench/browser/haystack-frontend/editor/editor"

interface GhostEditorContainerProps {
  editorId: string
}

// This is a dummy container used to prevent overly re-rendering due to camera/node
// position or dimensions changes.
export function GhostEditorContainer({ editorId }: GhostEditorContainerProps) {
  const editorPosition = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.getEditorPosition(editorId),
  )
  const scale = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.canvasScale,
  )
  const { width, height, vWidth, vHeight, zIndex, isPinned } =
    WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.idToEditorMap.get(editorId) as CanvasGhostEditor,
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
        <GhostEditorContainerImpl editorId={editorId} />
      </div>
    )
  )
}

export const GhostEditorContainerImpl = React.memo(
  function GhostEditorContainerImpl({ editorId }: GhostEditorContainerProps) {
    const scale = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.canvasScale,
    )
    const rootDirNameLen = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.getWorkspacePath()?.length,
    )
    const selection = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.selection,
    )
    const [containerElement, setContainerElement] =
      React.useState<HTMLDivElement | null>(null)
    const {
      filePath,
      uri,
      isDirty,
      isGhost,
      isPinned,
      value,
      editRange,
      symbolName,
      symbolType,
      options,
      identifier,
    } = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.idToEditorMap.get(editorId) as CanvasGhostEditor,
    )

    const isSelected = React.useMemo(() => selection.has(editorId), [selection])

    const [
      updateEditorBounds,
      deleteEditorsInSelection,
      selectEditor,
      closeEditor,
    ] = WorkspaceStoreWrapper.useWorkspaceState((state) => [
      state.updateEditorBounds,
      state.deleteEditorsInSelection,
      state.selectEditor,
      state.closeEditor,
    ])

    const relativeFilePath =
      rootDirNameLen == null ? filePath : filePath.substring(rootDirNameLen)

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

    const resizableOptions: ResizableOptions = React.useMemo(() => {
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

    useResizable(containerElement, resizableOptions)

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

    const modelRef: React.MutableRefObject<ITextModel | null> =
      React.useRef(null)

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
          if (modelRef.current != null) {
            WorkspaceStoreWrapper.getWorkspaceState().setEditorDirty(
              editorId,
              false,
            )
          }
        })

      return () => {
        listener?.dispose()
      }
    })

    const fileName = React.useMemo(() => {
      const dirs = filePath.split("/")
      return dirs[dirs.length - 1]
    }, [filePath])

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
        onKeyDown={(e) => {
          if (e.target !== containerElement) {
            return
          }
          onKeyDown(e)
        }}
        onFocusCapture={(e) => {
          if (containerElement?.contains(e.relatedTarget) ?? false) {
            WorkspaceStoreWrapper.getWorkspaceState().setFocusedEditor(editorId)
          }
          if (editorContainerRef.current?.contains(e.target)) {
            WorkspaceStoreWrapper.getWorkspaceState().panToFocusedEditor(
              editorId,
            )
          }
          selectEditor(editorId, /* clearSelection */ true)
        }}
        onBlurCapture={(e) => {
          if (
            WorkspaceStoreWrapper.getWorkspaceState().focusedEditorId ===
              editorId &&
            !WorkspaceStoreWrapper.getWorkspaceState().floatingToolbarElement?.contains(
              e.relatedTarget,
            )
          ) {
            WorkspaceStoreWrapper.getWorkspaceState().setFocusedEditor(null)
          }
        }}
        onKeyDownCapture={onKeyDownCapture}
        onWheelCapture={onWheelCapture}
        onPointerDownCapture={() => {
          selectEditor(editorId, /* clearSelection */ true)
        }}
        tabIndex={0}
      >
        <EditorHeader
          fileName={symbolName ?? fileName ?? ""}
          relativeFilePath={relativeFilePath}
          icon={symbolType ? getSymbolIcon(symbolType) : <SmallFileSvg />}
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
        {
          <GhostEditor
            filePath={filePath}
            uri={uri}
            editorId={editorId}
            modelRef={modelRef}
            value={value}
            isGhost={isGhost}
            editRange={editRange}
            options={options}
            editorContainerRef={editorContainerRef}
          />
        }
        {shouldDisplayViewportNumber && (
          <ViewportNumberDisplay editorId={editorId} />
        )}
      </div>
    )
  },
  compareProps,
)

function compareProps(
  { editorId: previouseditorId }: GhostEditorContainerProps,
  { editorId: nexteditorId }: GhostEditorContainerProps,
) {
  return previouseditorId === nexteditorId
}
