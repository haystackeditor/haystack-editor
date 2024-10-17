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
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { debounce } from "vs/workbench/browser/haystack-frontend/react_utils/debounce"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

export interface MoveOptions {
  eventHandler: (positionDelta: Vector) => void
  onClick?: (e: MouseEvent) => void
  onStart?: (e: MouseEvent) => void
  onEnd?: (e: MouseEvent) => void
}

interface MoveRequest {
  id: string
  options: MoveOptions
  element: HTMLElement
}

export class MoveHandler implements PointerEventHandler {
  private oldMousePosition = Vector.new()
  private isHovering = false
  private isDragging = false
  private activeRequest: MoveRequest | null = null
  private requests: MoveRequest[] = []
  private accumulatedDelta = Vector.new()
  private lastMoveEvent: PixiPointerEvent | null = null

  public readonly handlerType = PointerEventHandlerType.DOCUMENT

  public readonly handlerKind = PointerEventHandlerKind.MOVEMENT

  public constructor() {}

  public onPointerMove(event: PixiPointerEvent): boolean {
    if (event.nativeEvent.altKey) {
      this.isHovering = false
      this.clearCursor()
      return false
    }

    this.lastMoveEvent = event

    if (this.requests.length === 0) {
      if (this.isHovering) {
        this.isHovering = false
        this.clearCursor()
      }
      return false
    }

    const e = event.nativeEvent
    if (this.hitTest(e)) {
      this.isHovering = true
      document.body.classList.add("move")
      event.nativeEvent.stopPropagation()
    } else if (this.isHovering) {
      this.isHovering = false
      this.clearCursor()
    }

    return this.isHovering
  }

  private hitTest(e: MouseEvent): boolean {
    for (let i = this.requests.length - 1; i >= 0; --i) {
      const request = this.requests[i]
      if (!request.element.contains(e.target as HTMLElement)) {
        continue
      }

      const boundingBox = request.element.getBoundingClientRect()

      if (
        e.clientY < boundingBox.bottom &&
        e.clientY > boundingBox.top &&
        e.clientX > boundingBox.left &&
        e.clientX < boundingBox.right
      ) {
        this.activeRequest = request
        return true
      }
    }
    return false
  }

  public onPointerDown(event: PixiPointerEvent, forceAccept: boolean): boolean {
    if (
      forceAccept ||
      event.nativeEvent.button !== 0 ||
      this.activeRequest == null ||
      this.activeRequest.element == null ||
      !this.isHovering
    ) {
      this.isHovering = false
      this.clearCursor()
      return false
    }

    const e = event.nativeEvent
    this.oldMousePosition = new Vector(e.clientX, e.clientY)
    e.preventDefault()
    e.stopPropagation()
    return true
  }

  private dragTelemetry = debounce(
    () =>
      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry("Editor dragged"),
    1000
  )

  public onPointerDrag(event: PixiPointerEvent): void {
    if (this.activeRequest == null || this.activeRequest.element == null) {
      this.isDragging = false
      this.clearCursor()
      return
    }

    if (!this.isDragging) {
      this.isDragging = true
      this.activeRequest.options.onStart?.(event.nativeEvent)
    }
    this.dragTelemetry()

    const e = event.nativeEvent

    const deltaX = e.clientX - this.oldMousePosition.x
    const deltaY = e.clientY - this.oldMousePosition.y
    const positionDelta = new Vector(deltaX, deltaY)
    this.accumulatedDelta.add(positionDelta)

    this.oldMousePosition.x = e.clientX
    this.oldMousePosition.y = e.clientY

    const deltaThreshold = e.shiftKey ? 50 : 1

    if (Math.abs(this.accumulatedDelta.x) > deltaThreshold) {
      this.activeRequest.options.eventHandler(
        new Vector(Math.round(this.accumulatedDelta.x), 0)
      )
      this.accumulatedDelta.x = 0
    }

    if (Math.abs(this.accumulatedDelta.y) > deltaThreshold) {
      this.activeRequest.options.eventHandler(
        new Vector(0, Math.round(this.accumulatedDelta.y))
      )
      this.accumulatedDelta.y = 0
    }
  }

  public onPointerUp(event: PixiPointerEvent): void {
    if (this.isDragging) {
      this.isDragging = false
      if (this.activeRequest != null && this.activeRequest.element != null) {
        this.activeRequest.options.onEnd?.(event.nativeEvent)
      }
      this.clearCursor()
      this.activeRequest = null
    } else if (this.activeRequest != null) {
      if (this.activeRequest != null && this.activeRequest.element != null) {
        this.activeRequest.options.onClick?.(event.nativeEvent)
      }
      this.activeRequest = null
    }
  }

  public clearCursor(): void {
    document.body.classList.remove("move")
  }

  public addRequest(id: string, element: HTMLElement, options: MoveOptions) {
    this.requests.push({ id, element, options })

    // Replays the last move event since we may have to adjust the cursor.
    if (this.lastMoveEvent != null) {
      this.onPointerMove(this.lastMoveEvent)
    }
  }

  public removeRequest(id: string) {
    this.requests = this.requests.filter((request) => request.id !== id)
    if (this.lastMoveEvent != null) {
      this.onPointerMove(this.lastMoveEvent)
    }
  }
}
