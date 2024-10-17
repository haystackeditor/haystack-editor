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
import { Rectangle } from "vs/workbench/browser/haystack-frontend/canvas/rectangle"
import { UiManager } from "vs/workbench/browser/haystack-frontend/canvas/ui_manager"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { commitAction } from "vs/workbench/browser/haystack-frontend/canvas_utils/commit_action"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { Graphics } from "pixi.js"

export class SelectionHandler implements PointerEventHandler {
  private boxSelection!: Graphics
  private canvasMouseDownPos!: Vector
  private domMouseDownPos!: Vector

  public readonly handlerType = PointerEventHandlerType.CANVAS
  public readonly handlerKind = PointerEventHandlerKind.SELECTION

  public onPointerMove(event: PixiPointerEvent): boolean {
    return false
  }

  public onPointerDown(event: PixiPointerEvent): boolean {
    if (event.nativeEvent.button !== 0) return false

    this.boxSelection = new Graphics()
    const scene = UiManager.getUiStage()
    scene.addChild(this.boxSelection)

    this.canvasMouseDownPos = new Vector(event.canvasX, event.canvasY)
    this.domMouseDownPos = new Vector(event.viewportX, event.viewportY)

    if (!event.nativeEvent.shiftKey) {
      WorkspaceStoreWrapper.getWorkspaceState().clearSelection()
    }

    return true
  }

  public onPointerDrag(event: PixiPointerEvent): void {
    this.boxSelection.clear()
    const width = Math.abs(event.canvasX - this.canvasMouseDownPos.x)
    const height = Math.abs(event.canvasY - this.canvasMouseDownPos.y)
    const x = Math.min(event.canvasX, this.canvasMouseDownPos.x)
    const y = Math.min(event.canvasY, this.canvasMouseDownPos.y)

    this.boxSelection
      .rect(0, 0, width, height)
      .fill({
        color: 0x8affff,
        alpha: 0.2,
      })
      .stroke({
        width: 1,
        color: 0xadd8e6,
      })
    this.boxSelection.position.set(x, y)
    WorkspaceStoreWrapper.getWorkspaceState().dragSelectEditors(
      new Rectangle(
        this.domMouseDownPos.x,
        this.domMouseDownPos.y,
        event.viewportX,
        event.viewportY
      ),
      /* onlyAdd */ event.nativeEvent.shiftKey
    )
  }

  public onPointerUp(event: PixiPointerEvent): void {
    const scene = UiManager.getUiStage()
    scene.removeChild(this.boxSelection)
    this.boxSelection.destroy()
    commitAction()
  }

  public clearCursor(): void {}
}
