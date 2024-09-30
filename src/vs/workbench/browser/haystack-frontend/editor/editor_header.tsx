/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./file_editor"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { MoveOptions } from "../canvas/pointer_event_handlers/move_handler"
import { useMoveable } from "vs/workbench/browser/haystack-frontend/react_utils/create_moveable"
import {
  CloseSvg,
  DirtyFileSvg,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/svgs"
import { useCloseHeader } from "vs/workbench/browser/haystack-frontend/react_utils/create_close_header"
import { CanvasTooltip } from "vs/workbench/browser/haystack-frontend/design_components/canvas_tooltip"
import { isMacLike } from "vs/workbench/browser/haystack-frontend/react_utils/platform"
import { Orientation } from "vs/workbench/browser/haystack-frontend/design_components/ui_tooltip_common"
import { SymbolKind } from "vs/editor/common/languages"
import { getSymbolHeaderClassName } from "vs/workbench/browser/haystack-frontend/workspace/editors/utils/get_symbol_class_color"
import { concatenateClassNames } from "vs/workbench/browser/haystack-frontend/react_utils/concatenate_class_names"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

export const HEADER_HEIGHT = 25

interface EditorHeaderProps {
  fileName: string
  relativeFilePath: string
  onMove?: (delta: Vector) => void
  onClose: () => void
  icon?: React.ReactElement
  isDirty: boolean
  onMoveStart?: (e: MouseEvent) => void
  onMoveEnd?: (e: MouseEvent) => void
  onMoveClick?: (e: MouseEvent) => void
  symbolType?: SymbolKind
  editorId: string
}

export function EditorHeader({
  fileName,
  relativeFilePath,
  onClose,
  onMove,
  icon,
  isDirty,
  onMoveEnd,
  onMoveStart,
  onMoveClick,
  symbolType,
  editorId,
}: EditorHeaderProps) {
  const [headerElement, setHeaderElement] =
    React.useState<HTMLDivElement | null>(null)
  const headerRef = React.useCallback(
    (headerElement: HTMLDivElement | null) => {
      setHeaderElement(headerElement)
    },
    [],
  )
  const [closeButtonElement, setCloseButtonElement] =
    React.useState<HTMLButtonElement | null>(null)
  const closeButtonRef = React.useCallback(
    (closeButton: HTMLButtonElement | null) => {
      setCloseButtonElement(closeButton)
    },
    [],
  )

  const [isHoveringCloseButton, setIsHoveringCloseButton] =
    React.useState(false)

  const options: MoveOptions = React.useMemo(() => {
    return {
      eventHandler: (positionDelta: Vector) => {
        onMove?.(positionDelta)
      },
      onStart: onMoveStart,
      onEnd: onMoveEnd,
      onClick: onMoveClick,
    }
  }, [onMoveStart, onMoveEnd, onMoveClick])

  useMoveable(
    headerElement,
    options,
    /* useMoveBehaviorCondition */ onMoveStart != null &&
      onMoveClick != null &&
      onMoveEnd != null &&
      onMove != null,
  )

  useCloseHeader(headerElement, editorId)

  const reformattedPath = getReformattedPath(relativeFilePath)

  const canvasEditor = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.idToEditorMap.get(editorId),
  )

  return (
    <div
      className={concatenateClassNames([
        "fileEditorHeader",
        getSymbolHeaderClassName(symbolType),
      ])}
      style={{
        width: `${canvasEditor?.isPinned ? canvasEditor.vWidth : canvasEditor?.width}px`,
      }}
      ref={headerRef}
      tabIndex={0}
    >
      <div className="fileNameAndIconContainer">
        {icon && <div className="iconContainer">{icon}</div>}
        <div className="fileNameText">{fileName}</div>
      </div>
      <div className="filePathTextContainer">
        <div className="filePathText">{reformattedPath}</div>
      </div>
      <button
        ref={closeButtonRef}
        className="closeButton"
        onMouseEnter={() => setIsHoveringCloseButton(true)}
        onMouseLeave={() => setIsHoveringCloseButton(false)}
        onClick={(e) => {
          onClose()
          e.stopPropagation()
        }}
      >
        {!isDirty || isHoveringCloseButton ? (
          <CloseSvg
            customStyle={{
              display: "flex",
            }}
            width={12.5}
            height={12.5}
          />
        ) : (
          <DirtyFileSvg
            customStyle={{
              display: "flex",
            }}
            width={12.5}
            height={12.5}
          />
        )}
        <CanvasTooltip
          text={`Close Editor (${isMacLike() ? "⌘" : "^"}W)`}
          parentElement={closeButtonElement}
          orientation={Orientation.ABOVE}
        />
      </button>
    </div>
  )
}

function getReformattedPath(filePath: string) {
  // Get rid of the root dir.
  const components = filePath.split("/").slice(1)
  return components.join(" > ")
}
