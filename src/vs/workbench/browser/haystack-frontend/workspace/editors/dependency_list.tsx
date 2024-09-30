/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./editors"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { commitAction } from "vs/workbench/browser/haystack-frontend/canvas_utils/commit_action"
import { KeyCode } from "vs/workbench/browser/haystack-frontend/canvas/keyboard_constants"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { forwardWheelEventToPixi } from "vs/workbench/browser/haystack-frontend/canvas_utils/forward_wheel_event_to_pixi"
import { extractFileNameFromPath } from "vs/workbench/browser/haystack-frontend/react_utils/extract_name_from_path"
import {
  SymbolDep,
  SymbolDepsType,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { SymbolKind } from "vs/editor/common/languages"
import { Range } from "vs/editor/common/core/range"
import { RendererManager } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import {
  CanvasCodeEditor,
  CanvasEditor,
} from "vs/workbench/browser/haystack-frontend/editor/editor"
import { middlewareManager } from "vs/workbench/browser/haystack-frontend/middleware/middleware"
import { MiddlewareType } from "vs/workbench/browser/haystack-frontend/middleware/middleware_common"
import { SpatialSortMiddleware } from "vs/workbench/browser/haystack-frontend/middleware/spatial_sort_middleware"
import { ChevronRight } from "./svgs"

const DEPENDENCY_LIST_MIN_WIDTH = 250
const DEPENDENCY_LIST_MAX_WIDTH = 300

const METADATA_LIST_WIDTH = 250
const METADATA_LIST_MAX_HEIGHT = 500

interface SymbolDependencyListProps {
  editor: CanvasEditor
  absolutePosition: Vector
  relativePosition: Vector
  symbolDeps: SymbolDep[]
  closeList: () => void
  symbolDepsListType: SymbolDepsType
}

export function SymbolDependencyList({
  editor,
  absolutePosition,
  relativePosition,
  symbolDeps,
  closeList,
  symbolDepsListType,
}: SymbolDependencyListProps) {
  const [scale, canvasCamera] = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => [state.canvasScale, state.canvasCamera],
  )

  const [addAdjacentSymbol, addAdjacentFile] =
    WorkspaceStoreWrapper.useWorkspaceState((state) => [
      state.addAdjacentSymbol,
      state.addAdjacentFile,
    ])

  const [activeHeaderIndex, setActiveHeaderIndex] = React.useState<number>(0)

  const listRef = React.useRef<HTMLDivElement>(null)
  const activeButtonRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    listRef.current?.focus()
    listRef.current?.addEventListener("wheel", onWheelEvent, {
      passive: false,
    })
    return () => listRef.current?.removeEventListener("wheel", onWheelEvent)
  }, [listRef.current])

  const onSelect = (index: number) => {
    setActiveHeaderIndex(index)

    WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
      "Symbol dependency header item hovered",
    )
  }

  const onSelectMetadatum = async (
    e: React.PointerEvent | React.KeyboardEvent,
    metadataIndex: number,
  ) => {
    if (activeHeaderIndex == null) return
    const symbolDep = symbolDeps[activeHeaderIndex]

    const metadatum = symbolDep.metadata[metadataIndex]

    WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
      "Symbol dependency list item clicked",
    )

    if (
      symbolDep.symbolType === SymbolKind.File ||
      symbolDep.symbolType == null ||
      symbolDep.range == null
    ) {
      await addAdjacentFile(
        editor,
        symbolDep.filePath,
        symbolDep.uri,
        /* selectAndFocusEditor */ !e.shiftKey,
        {
          selectionRange: {
            startLineNumber: metadatum.callRange.startLineNumber,
            startColumn: metadatum.callRange.startColumn,
            endLineNumber: metadatum.callRange.startLineNumber,
            endColumn: metadatum.callRange.startColumn,
          },
        },
        { preserveFocus: e.shiftKey },
      )
    } else {
      const adjacenteditorId = await addAdjacentSymbol(
        editor,
        symbolDep.identifier,
        symbolDep.symbolType,
        symbolDep.range,
        symbolDep.filePath,
        symbolDep.uri,
        /* selectAndFocusEditor */ !e.shiftKey,
        {
          selectionRange: {
            startLineNumber: metadatum.callRange.startLineNumber,
            startColumn: metadatum.callRange.startColumn,
            endLineNumber: metadatum.callRange.startLineNumber,
            endColumn: metadatum.callRange.startColumn,
          },
        },
        { preserveFocus: e.shiftKey },
      )

      if ((editor as CanvasCodeEditor).editRange != null) {
        const spatialSortMiddleware = middlewareManager.getMiddleware(
          MiddlewareType.SPATIAL_SORT,
        ) as SpatialSortMiddleware

        if (symbolDepsListType === SymbolDepsType.INCOMING) {
          spatialSortMiddleware.unconditionallyAddRelationship(
            [metadatum.callRange],
            adjacenteditorId,
            editor.uuid,
          )
        } else if (symbolDepsListType === SymbolDepsType.OUTGOING) {
          spatialSortMiddleware.unconditionallyAddRelationship(
            metadatum.fromRanges,
            editor.uuid,
            adjacenteditorId,
          )
        }
      }
    }

    if (!e.shiftKey) {
      closeList()
    }

    commitAction()
  }

  const onListKeyDown = (e: React.KeyboardEvent) => {
    switch (e.code) {
      case KeyCode.ARROW_UP: {
        const nextActiveHeaderIndex =
          !activeHeaderIndex || activeHeaderIndex === 0
            ? symbolDeps.length - 1
            : activeHeaderIndex - 1
        setActiveHeaderIndex(nextActiveHeaderIndex)
        onSelect(nextActiveHeaderIndex)
        e.preventDefault()
        e.stopPropagation()
        break
      }
      case KeyCode.ARROW_DOWN: {
        const nextActiveHeaderIndex =
          activeHeaderIndex == null ||
          activeHeaderIndex === symbolDeps.length - 1
            ? 0
            : activeHeaderIndex + 1
        setActiveHeaderIndex(nextActiveHeaderIndex)
        onSelect(nextActiveHeaderIndex)
        e.preventDefault()
        e.stopPropagation()
        break
      }
      case KeyCode.SPACE:
      case KeyCode.ENTER: {
        onSelectMetadatum(e, 0)
      }
      case KeyCode.ARROW_RIGHT: {
        focusOnMetadataListRef.current?.()
        break
      }
      case KeyCode.ESCAPE:
        e.preventDefault()
        e.stopPropagation()
        closeList()
        break
    }
  }

  React.useEffect(() => {
    activeButtonRef.current?.focus()

    const container = listRef.current
    const button = activeButtonRef.current
    if (container == null || button == null) return
    const cTop = container.scrollTop
    const cBottom = cTop + container.clientHeight
    const bTop = button.offsetTop
    const bBottom = bTop + button.clientHeight
    if (cBottom < bBottom) {
      container.scrollTop = bBottom - container.clientHeight
    } else if (cTop > bTop) {
      container.scrollTop = bTop
    }
  }, [activeHeaderIndex])

  const [container, setContainer] = React.useState<HTMLDivElement | null>(null)
  const containerRef = React.useCallback((container: HTMLDivElement) => {
    setContainer(container)
  }, [])

  React.useEffect(() => {
    container?.focus()
  }, [container])

  const maxHeight = React.useMemo(() => {
    const viewportBounds =
      RendererManager.getInstance().getViewportDimensionsWithPadding()
    const dependencyListViewportPosition = Vector.add(
      canvasCamera,
      absolutePosition,
    )
    return Math.min(
      METADATA_LIST_MAX_HEIGHT,
      viewportBounds.y - dependencyListViewportPosition.y,
    )
  }, [absolutePosition, canvasCamera])

  const focusOnMetadataListRef: React.MutableRefObject<(() => void) | null> =
    React.useRef(null)

  return (
    <div className="symbolDepListContainer">
      <div
        className={classNames({
          symbolDepList: true,
        })}
        style={{
          transform: `translate(${relativePosition.x}px, ${relativePosition.y}px) scale(${scale})`,
          minWidth: `${DEPENDENCY_LIST_MIN_WIDTH}px`,
          maxWidth: `${DEPENDENCY_LIST_MAX_WIDTH}px`,
          maxHeight: `${maxHeight}px`,
        }}
        ref={containerRef}
      >
        <div
          className="symbolDepContainer"
          ref={listRef}
          onKeyDown={onListKeyDown}
          tabIndex={0}
        >
          {symbolDeps.map((symbolDep, symbolDepIndex) => {
            return (
              <button
                key={`${symbolDep.symbolType}-${symbolDep.identifier}-${
                  symbolDep.filePath
                }-${
                  symbolDep.range
                    ? Range.fromIRange(symbolDep.range).toString()
                    : "null"
                }`}
                className={classNames({
                  symbolDepRow: true,
                  selected: activeHeaderIndex === symbolDepIndex,
                })}
                onPointerEnter={() => onSelect(symbolDepIndex)}
                onPointerUp={
                  symbolDep.metadata.length === 1
                    ? (e) => onSelectMetadatum(e, 0)
                    : undefined
                }
              >
                <div className="symbolDepHeaderTextContainer">
                  <span className="symbolDepHeaderText">
                    {symbolDep.identifier}
                  </span>
                  <span className="symbolDepHeaderTextPath">
                    {extractFileNameFromPath(symbolDep.filePath)}
                  </span>
                </div>
                {symbolDep.metadata.length > 1 && (
                  <div className="symbolDepHeaderIconContainer">
                    <ChevronRight
                      darkMode={WorkspaceStoreWrapper.getWorkspaceState().isDarkMode()}
                    />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
      {activeHeaderIndex != null &&
        activeHeaderIndex < symbolDeps.length &&
        symbolDeps[activeHeaderIndex].metadata.length > 1 && (
          <MetadataList
            dependencyListAbsolutePosition={absolutePosition}
            metadataListRelativePosition={Vector.add(
              relativePosition,
              new Vector(
                (container?.clientWidth ?? 300) - 10,
                activeHeaderIndex * 20 - (listRef.current?.scrollTop ?? 0),
              ).mul(scale),
            )}
            symbolDep={symbolDeps[activeHeaderIndex]}
            closeList={closeList}
            onSelect={onSelectMetadatum}
            focusOnHeader={() => {
              listRef.current?.focus()
            }}
            focusOnMetadataListRef={focusOnMetadataListRef}
          />
        )}
    </div>
  )
}

function onWheelEvent(e: WheelEvent) {
  if (forwardWheelEventToPixi(e)) {
    e.preventDefault()
  } else {
    e.stopPropagation()
  }
}

interface MetadataListProps {
  dependencyListAbsolutePosition: Vector
  metadataListRelativePosition: Vector
  symbolDep: SymbolDep
  closeList: () => void
  onSelect: (e: React.PointerEvent | React.KeyboardEvent, index: number) => void
  focusOnHeader: () => void
  focusOnMetadataListRef: React.MutableRefObject<(() => void) | null>
}

export function MetadataList({
  dependencyListAbsolutePosition,
  metadataListRelativePosition,
  symbolDep,
  closeList,
  onSelect,
  focusOnHeader,
  focusOnMetadataListRef,
}: MetadataListProps) {
  const [scale, canvasCamera] = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => [state.canvasScale, state.canvasCamera],
  )

  const [activeMetadataIndex, setActiveMetadataIndex] = React.useState<
    number | null
  >(null)

  const activeButtonRef = React.useRef<HTMLButtonElement>(null)

  const listRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    listRef.current?.addEventListener("wheel", onWheelEvent, {
      passive: false,
    })
    return () => listRef.current?.removeEventListener("wheel", onWheelEvent)
  }, [])

  React.useEffect(() => {
    focusOnMetadataListRef.current = () => {
      listRef.current?.focus()
      setActiveMetadataIndex(0)
    }
  }, [])

  const onListKeyDown = (e: React.KeyboardEvent) => {
    switch (e.code) {
      case KeyCode.ARROW_UP: {
        const nextActiveMetadataIndex = !activeMetadataIndex
          ? symbolDep.metadata.length - 1
          : activeMetadataIndex - 1
        setActiveMetadataIndex(nextActiveMetadataIndex)
        e.preventDefault()
        e.stopPropagation()
        break
      }
      case KeyCode.ARROW_DOWN: {
        const nextActiveMetadataIndex =
          activeMetadataIndex == null ||
          activeMetadataIndex === symbolDep.metadata.length - 1
            ? 0
            : activeMetadataIndex + 1
        setActiveMetadataIndex(nextActiveMetadataIndex)
        e.preventDefault()
        e.stopPropagation()
        break
      }
      case KeyCode.ARROW_LEFT: {
        focusOnHeader()
        setActiveMetadataIndex(null)
        e.preventDefault()
        e.stopPropagation()
        break
      }
      case KeyCode.SPACE:
      case KeyCode.ENTER: {
        onSelect(e, activeMetadataIndex ?? 0)
      }
      case KeyCode.ESCAPE:
        e.preventDefault()
        e.stopPropagation()
        closeList()
        break
    }
  }

  React.useEffect(() => {
    activeButtonRef.current?.focus()

    const container = listRef.current
    const button = activeButtonRef.current
    if (container == null || button == null) return
    const cTop = container.scrollTop
    const cBottom = cTop + container.clientHeight
    const bTop = button.offsetTop
    const bBottom = bTop + button.clientHeight
    if (cBottom < bBottom) {
      container.scrollTop = bBottom - container.clientHeight
    } else if (cTop > bTop) {
      container.scrollTop = bTop
    }
  }, [activeMetadataIndex])

  const maxHeight = React.useMemo(() => {
    const viewportBounds =
      RendererManager.getInstance().getViewportDimensionsWithPadding()
    const metadataListAbsolutePosition = Vector.add(
      dependencyListAbsolutePosition,
      metadataListRelativePosition,
    )
    const metadataListViewportPosition = Vector.add(
      canvasCamera,
      metadataListAbsolutePosition,
    )
    return Math.min(
      METADATA_LIST_MAX_HEIGHT,
      viewportBounds.y - metadataListViewportPosition.y,
    )
  }, [dependencyListAbsolutePosition, canvasCamera])

  return (
    <div
      className={classNames({
        symbolDepList: true,
      })}
      style={{
        transform: `translate(${metadataListRelativePosition.x}px, ${metadataListRelativePosition.y}px) scale(${scale})`,
        width: `${METADATA_LIST_WIDTH}px`,
        maxHeight: `${maxHeight}px`,
      }}
    >
      <div
        className="symbolDepContainer"
        ref={listRef}
        onKeyDown={onListKeyDown}
        tabIndex={0}
      >
        {symbolDep.metadata.map((metadatum, metadataIndex) => (
          <div
            key={`${metadatum.callRange.startLineNumber}-${metadatum.callRange.endLineNumber}`}
            className="symbolDepContainer"
          >
            <button
              className={classNames({
                symbolDepRow: true,
                selected: activeMetadataIndex === metadataIndex,
              })}
              onPointerUp={(e) => onSelect(e, metadataIndex)}
            >
              <span className="symbolDepHeaderLineNumber">
                {metadatum.callRange.startLineNumber}
              </span>
              <div className="symbolDepSnippet">{metadatum.snippet}</div>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
