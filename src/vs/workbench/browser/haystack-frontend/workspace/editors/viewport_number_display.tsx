/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./editors"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { RendererManager } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import { Rectangle } from "vs/workbench/browser/haystack-frontend/canvas/rectangle"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { middlewareManager } from "vs/workbench/browser/haystack-frontend/middleware/middleware"
import { MiddlewareType } from "vs/workbench/browser/haystack-frontend/middleware/middleware_common"
import { SpatialSortMiddleware } from "vs/workbench/browser/haystack-frontend/middleware/spatial_sort_middleware"

interface ViewportNumberDisplayProps {
  editorId: string
}

export function ViewportNumberDisplay({
  editorId,
}: ViewportNumberDisplayProps) {
  const cameraPosition = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.canvasCamera,
  )
  const canvasScale = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.canvasScale,
  )
  const editor = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.idToEditorMap.get(editorId),
  )

  const spatialSortMiddleware = React.useMemo(
    () =>
      middlewareManager.getMiddleware(
        MiddlewareType.SPATIAL_SORT,
      ) as SpatialSortMiddleware,
    [],
  )

  const editorNumber = React.useMemo(
    () =>
      editor
        ? spatialSortMiddleware.getEditorEnumerationInViewport(editor)
        : null,
    [editor, spatialSortMiddleware, cameraPosition],
  )

  const editorPositionInViewport = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.getEditorPosition(editorId),
  )

  const viewportBounds = React.useMemo(() => {
    const viewportDimensions =
      RendererManager.getInstance().getViewportDimensions()
    return Rectangle.fromPositionAndSize(Vector.new(), viewportDimensions)
  }, [cameraPosition])

  const editorSize = React.useMemo(() => {
    if (editor == null) return Vector.new()
    return new Vector(editor.width, editor.height)
  }, [editor])

  const displayPosition = React.useMemo(() => {
    const centerOffset = Vector.div(editorSize, 2).div(canvasScale)
    // We need to find a position on the editor that is visible.
    const editorBounds = Rectangle.fromPositionAndSize(
      editorPositionInViewport,
      Vector.mul(editorSize, canvasScale),
    )

    const intersection = viewportBounds.intersection(editorBounds)
    if (intersection == null) return centerOffset

    // Remember that the display position is relative to the editor, and
    // that the canvas is scaled.
    return Vector.div(
      Vector.sub(intersection.center(), editorPositionInViewport),
      canvasScale,
    )
  }, [editorPositionInViewport, viewportBounds, editorSize])

  if (editor == null || editorNumber == null) return null

  return (
    <div
      className="viewportNumberDisplay"
      // The 12.5 is half the width of the number display.
      style={{
        transform: `translate(${displayPosition.x - 12.5}px, ${
          displayPosition.y - 12.5
        }px)`,
      }}
    >
      {editorNumber}
    </div>
  )
}
