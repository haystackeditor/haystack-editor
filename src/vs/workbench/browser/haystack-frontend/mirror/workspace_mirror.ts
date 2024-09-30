/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { transformFromViewportToCanvas } from "vs/workbench/browser/haystack-frontend/mirror/react_to_pixi"
import { middlewareManager } from "vs/workbench/browser/haystack-frontend/middleware/middleware"
import { MiddlewareType } from "vs/workbench/browser/haystack-frontend/middleware/middleware_common"
import { SpatialSortMiddleware } from "vs/workbench/browser/haystack-frontend/middleware/spatial_sort_middleware"

// Pixi --> React
export function updateUiPosition(cameraDelta: Vector) {
  WorkspaceStoreWrapper.getWorkspaceState().updateUiPosition(cameraDelta)
}

export function setScale(scale: number, mousePosition: Vector) {
  WorkspaceStoreWrapper.getWorkspaceState().setScale(scale, mousePosition)
}

export function getEditor(editorId: string) {
  return WorkspaceStoreWrapper.getWorkspaceState().idToEditorMap.get(editorId)
}

export function deleteEditorsInSelection() {
  WorkspaceStoreWrapper.getWorkspaceState().deleteEditorsInSelection()
}

export function selectAllEditors() {
  WorkspaceStoreWrapper.getWorkspaceState().selectAllEditors()
}

export function getCanvasEditorSelection() {
  return WorkspaceStoreWrapper.getWorkspaceState().getEditorSelection()
}

// React --> Pixi
export function goToNextEditor(direction: 1 | -1): Vector[] | null[] {
  const spatialSortMiddleware = middlewareManager.getMiddleware(
    MiddlewareType.SPATIAL_SORT,
  ) as SpatialSortMiddleware
  const scale = WorkspaceStoreWrapper.getWorkspaceState().canvasScale
  const nextEditor = spatialSortMiddleware.goToNextEditor(direction)
  if (nextEditor == null) return [null, null]

  return [
    transformFromViewportToCanvas(
      WorkspaceStoreWrapper.getWorkspaceState().getEditorPosition(
        nextEditor.uuid,
      ),
      scale,
    ),
    new Vector(nextEditor.width, nextEditor.height),
  ]
}

export function getCanvasScale(): number {
  return WorkspaceStoreWrapper.getWorkspaceState().canvasScale
}

export function getEditorPosition(editorId: string): Vector {
  return WorkspaceStoreWrapper.getWorkspaceState().getEditorPosition(editorId)
}
