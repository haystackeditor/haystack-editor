/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import {
  PointerEventHandler,
  PixiPointerEvent,
  PointerEventHandlerKind,
  PointerEventHandlerType,
} from "./pointer_event_handler"
import { RendererManager } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

export class HandDragHandler implements PointerEventHandler {
  private cameraMouseDownPos!: Vector
  private viewportMouseDownPos!: Vector

  public readonly handlerType = PointerEventHandlerType.DOCUMENT
  public readonly handlerKind = PointerEventHandlerKind.HAND

  public onPointerMove(event: PixiPointerEvent): boolean {
    if (
      (event.nativeEvent.altKey &&
        event.nativeEvent.target instanceof HTMLCanvasElement) ||
      event.nativeEvent.button > 0
    ) {
      document.body.classList.add("handModeIdle")
      return true
    }
    document.body.classList.remove("handModeIdle")
    return false
  }

  public onPointerDown(
    event: PixiPointerEvent,
    forceAccept?: boolean,
  ): boolean {
    if (
      forceAccept ||
      (event.nativeEvent.altKey &&
        event.nativeEvent.target instanceof HTMLCanvasElement) ||
      event.nativeEvent.button == 1
    ) {
      if (event.nativeEvent.altKey) {
        WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
          "Canvas dragged via alt and left-click",
        )
      } else if (event.nativeEvent.button == 1) {
        WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
          "Canvas dragged via middle mouse button",
        )
      } else if (forceAccept) {
        WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
          "Canvas dragged via right-click",
        )
      }
      document.body.classList.add("handModeDrag")
      this.viewportMouseDownPos = new Vector(event.viewportX, event.viewportY)
      this.cameraMouseDownPos =
        RendererManager.getInstance().getCameraPosition()
      event.nativeEvent.preventDefault()
      event.nativeEvent.stopPropagation()
      return true
    }
    return false
  }

  public onPointerDrag(event: PixiPointerEvent): void {
    RendererManager.getInstance().setCameraPosition(
      Vector.add(
        this.cameraMouseDownPos,
        new Vector(
          (this.viewportMouseDownPos.x - event.viewportX) / event.canvasScale,
          (this.viewportMouseDownPos.y - event.viewportY) / event.canvasScale,
        ),
      ),
    )
    event.nativeEvent.preventDefault()
    event.nativeEvent.stopPropagation()
  }

  public onPointerUp(event: PixiPointerEvent): void {
    document.body.classList.remove("handModeDrag")
    event.nativeEvent.preventDefault()
    event.nativeEvent.stopPropagation()
  }

  public clearCursor(): void {
    document.body.classList.remove("handModeDrag")
    document.body.classList.remove("handModeIdle")
  }
}
