/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { ResizableOptions } from "../../canvas/pointer_event_handlers/resize_handler"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { commitAction } from "vs/workbench/browser/haystack-frontend/canvas_utils/commit_action"
import {
  EditorHeader,
  HEADER_HEIGHT,
} from "vs/workbench/browser/haystack-frontend/editor/editor_header"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { useResizable } from "vs/workbench/browser/haystack-frontend/react_utils/create_resizable"
import {
  useEditorOnKeyDown,
  useEditorOnKeyDownCapture,
  useScrollHandler,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/editor_utils"
import * as React from "react"
import "vs/css!./editors"
import { ModalEditor } from "vs/workbench/browser/haystack-frontend/editor/modal_editor"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { ViewportNumberDisplay } from "vs/workbench/browser/haystack-frontend/workspace/editors/viewport_number_display"
import { KeybindingsEditorInput } from "vs/workbench/services/preferences/browser/keybindingsEditorInput"
import { useMemoizedCanvasBoundingBox } from "vs/workbench/browser/haystack-frontend/react_utils/memoized_canvas_bounding_box"
import { Dimension } from "vs/base/browser/dom"
import { WebviewInput } from "vs/workbench/contrib/webviewPanel/browser/webviewEditorInput"
import { WalkThroughInput } from "vs/workbench/contrib/welcomeWalkthrough/browser/walkThroughInput"
import { CanvasModalEditor } from "vs/workbench/browser/haystack-frontend/editor/editor"
import { useHandleBoundsKeyDown } from "vs/workbench/browser/haystack-frontend/workspace/editors/utils/bounds_handling"
import { SmallFileSvg } from "vs/workbench/browser/haystack-frontend/workspace/editors/svgs"

interface ModalEditorContainerProps {
  editorId: string
}

// This is a dummy container used to prevent overly re-rendering due to camera/editor
// position or dimensions changes.
export function ModalEditorContainer({ editorId }: ModalEditorContainerProps) {
  const editorPosition = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.getEditorPosition(editorId),
  )
  const scale = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.canvasScale,
  )
  const boundingBox = useMemoizedCanvasBoundingBox()

  const { width, height, vWidth, vHeight, zIndex, editorPane, isPinned } =
    WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.idToEditorMap.get(editorId) as CanvasModalEditor,
    )

  const isSelected = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.selection.has(editorId),
  )

  React.useEffect(() => {
    const layoutWidth = isPinned ? vWidth : width * scale
    const layoutHeight = isPinned
      ? vHeight - HEADER_HEIGHT - 2
      : (height - HEADER_HEIGHT - 2) * scale

    editorPane?.layout(new Dimension(layoutWidth, layoutHeight))
  }, [
    editorPane,
    width,
    height,
    vWidth,
    vHeight,
    isPinned,
    editorPosition,
    scale,
  ])

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
          zIndex: isSelected ? 99 : zIndex,
        }}
      >
        <ModalEditorContainerImpl editorId={editorId} />
      </div>
    )
  )
}

export const ModalEditorContainerImpl = React.memo(
  function ModalEditorContainerImpl({ editorId }: ModalEditorContainerProps) {
    const selection = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.selection,
    )
    const [containerElement, setContainerElement] =
      React.useState<HTMLDivElement | null>(null)
    const { selectionRange, input, isDirty, options, isPinned } =
      WorkspaceStoreWrapper.useWorkspaceState(
        (state) => state.idToEditorMap.get(editorId) as CanvasModalEditor,
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

    const filePath = React.useMemo(() => {
      if (input instanceof KeybindingsEditorInput) {
        return ""
      } else if (input instanceof WebviewInput) {
        return ""
      }

      return input.resource?.fsPath ?? ""
    }, [input])

    const fileName = React.useMemo(() => {
      if (input instanceof WalkThroughInput) {
        return "Walkthrough"
      } else if (input instanceof KeybindingsEditorInput) {
        return "Keyboard Shortcuts"
      } else if (input instanceof WebviewInput) {
        return input.getName()
      } else if (input.resource?.scheme === "walkThrough") {
        return "Welcome"
      }

      return input.resource?.fsPath.split("/").pop() ?? ""
    }, [input])

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

    const thisEditorIsFocused = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.focusedEditorId === editorId,
    )

    const isHoldingModifier = WorkspaceStoreWrapper.useWorkspaceState(
      (state) => state.isHoldingModifier,
    )

    const shouldDisplayViewportNumber = React.useMemo(() => {
      return !thisEditorIsFocused && isHoldingModifier
    }, [isHoldingModifier, thisEditorIsFocused])

    return (
      <div
        className={classNames({
          fileEditorContainer: true,
          selected: isSelected,
          pinned: isPinned,
          modal: true,
        })}
        ref={containerRef}
        onKeyDown={(e) => {
          if (e.target !== containerElement) {
            return
          }
          onKeyDown(e)
        }}
        onFocusCapture={(e) => {
          WorkspaceStoreWrapper.getWorkspaceState().setFocusedEditor(editorId)

          const editorContainsTarget = !!containerElement?.contains(e.target)
          if (editorContainsTarget) {
            // We pan to the editor if the user clicked inside the editor.
            WorkspaceStoreWrapper.getWorkspaceState().panToFocusedEditor(
              editorId,
            )
          }

          selectEditor(editorId, /* clearSelection */ true)
        }}
        onKeyDownCapture={onKeyDownCapture}
        onWheelCapture={onWheelCapture}
        onPointerDownCapture={() => {
          selectEditor(editorId, /* clearSelection */ true)
        }}
        tabIndex={0}
      >
        <EditorHeader
          fileName={fileName ?? ""}
          relativeFilePath={filePath}
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
        {
          <ModalEditor
            input={input}
            selectionRange={selectionRange}
            editorId={editorId}
            options={options}
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
  { editorId: previouseditorId }: ModalEditorContainerProps,
  { editorId: nexteditorId }: ModalEditorContainerProps,
) {
  return previouseditorId === nexteditorId
}
