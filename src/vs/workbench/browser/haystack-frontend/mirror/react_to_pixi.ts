/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { Rectangle } from "vs/workbench/browser/haystack-frontend/canvas/rectangle"
import { RendererManager } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { NavigationType } from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import { DependencyArrow } from "vs/workbench/services/haystack/common/haystackService"

// React --> Pixi
export function forwardKeyboardInputToPixi(e: KeyboardEvent): void {
  RendererManager.getInstance().forwardKeyboardInputToPixi(e)
}

export function getCanvasOffset(): Vector {
  return RendererManager.getInstance().canvasOffset()
}

export function getCenterOfCanvas(): Vector {
  return RendererManager.getInstance().getCenterOfCanvasViewport()
}

export function getUpperLeftQuadrantViewport(): Vector {
  return RendererManager.getInstance().getUpperLeftQuadrantViewport()
}

export function navigateToPosition(
  canvasPosition: Vector,
  size: Vector,
  navigationType: NavigationType,
  unconditionally?: boolean,
): void {
  unconditionally
    ? RendererManager.getInstance().navigateToPositionUnconditionally(
        canvasPosition,
        size,
        navigationType,
      )
    : RendererManager.getInstance().navigateToPosition(
        canvasPosition,
        size,
        navigationType,
      )
}

export function getViewportDimensionsWithPadding(): Vector {
  return RendererManager.getInstance().getViewportDimensionsWithPadding()
}

export function transformFromViewportToCanvas(
  position: Vector,
  canvasScale: number,
): Vector {
  const rendererManager = RendererManager.getInstance()
  const canvasPosition = rendererManager.canvasPosition()
  return Vector.add(Vector.div(position, canvasScale), canvasPosition)
}

export function setDependencyArrows(
  dependencyArrows: DependencyArrow[],
  scale: number,
) {
  for (const arrow of dependencyArrows) {
    arrow.from = transformFromViewportToCanvas(arrow.from, scale)
    arrow.to = transformFromViewportToCanvas(arrow.to, scale)
  }
  RendererManager.getInstance().setDependencyArrows(dependencyArrows)
}

export function getCanvasPosition(): Vector {
  return RendererManager.getInstance().canvasPosition()
}

export function getViewportBounds(): Rectangle {
  return RendererManager.getInstance().getViewportRect()
}
