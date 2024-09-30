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
import { commitAction } from "vs/workbench/browser/haystack-frontend/canvas_utils/commit_action"
import { debounce } from "vs/workbench/browser/haystack-frontend/react_utils/debounce"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

type ResizeEventHandler = (event: ResizeEvent) => void

const enum ResizeType {
  NONE = 0,
  TOP = 2,
  BOTTOM = 4,
  LEFT = 8,
  RIGHT = 16,
  TOP_RIGHT = TOP | RIGHT,
  TOP_LEFT = TOP | LEFT,
  BOTTOM_RIGHT = BOTTOM | RIGHT,
  BOTTOM_LEFT = BOTTOM | LEFT,
}

export interface Size {
  width: number
  height: number
}

export interface SizeRestriction {
  min?: Size
  max?: Size
}

export interface Edges {
  left: boolean
  right: boolean
  bottom: boolean
  top: boolean
}

export interface ResizeEvent {
  positionDelta: Vector
  sizeDelta: Vector
}

export interface ResizableOptions {
  edges: Edges
  margin: number
  eventHandler: ResizeEventHandler
  restriction?: SizeRestriction
  onClick?: (e: MouseEvent) => void
  onStart?: (e: MouseEvent) => void
  onEnd?: (e: MouseEvent) => void
  doNotConsiderScale?: boolean
}

interface ResizeRequest {
  id: string
  options: ResizableOptions
  element: HTMLElement
}

export class ResizeHandler implements PointerEventHandler {
  private oldMousePosition = Vector.new()
  private resizeType = ResizeType.NONE
  private isDragging = false
  private activeRequest: ResizeRequest | null = null
  private requests: ResizeRequest[] = []

  public readonly handlerType = PointerEventHandlerType.DOCUMENT
  public readonly handlerKind = PointerEventHandlerKind.RESIZE

  public constructor() {}

  public onPointerMove(event: PixiPointerEvent): boolean {
    if (event.nativeEvent.altKey) {
      this.resizeType = ResizeType.NONE
      this.clearCursor()
      return false
    }

    if (this.requests.length === 0) {
      if (this.resizeType !== ResizeType.NONE) {
        this.resizeType = ResizeType.NONE
        this.clearCursor()
      }
      return false
    }

    const e = event.nativeEvent
    const oldResizeType = this.resizeType
    this.resizeType = this.hitTest(e)
    if (this.resizeType !== oldResizeType) {
      this.clearCursor()
    }

    switch (this.resizeType) {
      case ResizeType.LEFT:
      case ResizeType.RIGHT:
        document.body.classList.add("resizeHorizontal")
        break
      case ResizeType.TOP:
      case ResizeType.BOTTOM:
        document.body.classList.add("resizeVertical")
        break
      case ResizeType.TOP_RIGHT:
      case ResizeType.BOTTOM_LEFT:
        document.body.classList.add("resizeDiagonalRight")
        break
      case ResizeType.TOP_LEFT:
      case ResizeType.BOTTOM_RIGHT:
        document.body.classList.add("resizeDiagonalLeft")
        break
    }
    return this.resizeType !== ResizeType.NONE
  }

  private hitTest(e: MouseEvent): ResizeType {
    for (let i = this.requests.length - 1; i >= 0; --i) {
      const request = this.requests[i]
      if (
        !(e.target instanceof HTMLCanvasElement) &&
        !request.element.contains(e.target as HTMLElement)
      ) {
        continue
      }

      const boundingBox = request.element.getBoundingClientRect()
      const edges = request.options.edges
      const withinDelta = (mousePos: number, boundingBoxPos: number) =>
        mousePos > boundingBoxPos - request.options.margin &&
        mousePos < boundingBoxPos + request.options.margin

      const withinBounds = (vertical: boolean) =>
        vertical
          ? e.clientY < boundingBox.bottom + request.options.margin &&
            e.clientY > boundingBox.top - request.options.margin
          : e.clientX > boundingBox.left - request.options.margin &&
            e.clientX < boundingBox.right + request.options.margin

      const rightDrag =
        edges.right &&
        withinDelta(e.clientX, boundingBox.right) &&
        withinBounds(true)
      const leftDrag =
        edges.left &&
        withinDelta(e.clientX, boundingBox.left) &&
        withinBounds(true)
      const bottomDrag =
        edges.bottom &&
        withinDelta(e.clientY, boundingBox.bottom) &&
        withinBounds(false)
      const topDrag =
        edges.top &&
        withinDelta(e.clientY, boundingBox.top) &&
        withinBounds(false)

      let resizeType = 0

      if (rightDrag) {
        resizeType |= ResizeType.RIGHT
      } else if (leftDrag) {
        resizeType |= ResizeType.LEFT
      }
      if (topDrag) {
        resizeType |= ResizeType.TOP
      } else if (bottomDrag) {
        resizeType |= ResizeType.BOTTOM
      }

      if (resizeType !== ResizeType.NONE) {
        this.activeRequest = request
        return resizeType
      }
    }

    return ResizeType.NONE
  }

  public onPointerDown(event: PixiPointerEvent): boolean {
    if (
      event.nativeEvent.button === 2 ||
      this.requests.length === 0 ||
      this.resizeType === ResizeType.NONE
    ) {
      return false
    }

    const e = event.nativeEvent
    this.oldMousePosition = new Vector(e.clientX, e.clientY)
    e.preventDefault()
    e.stopPropagation()
    return true
  }

  private debouncedLogging = debounce((positionDelta, sizeDelta) => {
    WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry("Editor resized")
    // console.log(positionDelta)
    // console.log(sizeDelta)
  }, 1000)

  public onPointerDrag(event: PixiPointerEvent): void {
    if (!this.isDragging) {
      this.isDragging = true
      this.activeRequest?.options.onStart?.(event.nativeEvent)
    }
    const e = event.nativeEvent

    let sizeDelta = Vector.new()
    let positionDelta = Vector.new()

    const deltaX = e.clientX - this.oldMousePosition.x
    const deltaY = e.clientY - this.oldMousePosition.y

    switch (this.resizeType) {
      case ResizeType.TOP: {
        positionDelta = new Vector(0, deltaY)
        sizeDelta = new Vector(0, -deltaY)
        break
      }
      case ResizeType.TOP_RIGHT: {
        positionDelta = new Vector(0, deltaY)
        sizeDelta = new Vector(deltaX, -deltaY)
        break
      }
      case ResizeType.RIGHT: {
        sizeDelta = new Vector(deltaX, 0)
        break
      }
      case ResizeType.BOTTOM_RIGHT: {
        sizeDelta = new Vector(deltaX, deltaY)
        break
      }
      case ResizeType.BOTTOM: {
        sizeDelta = new Vector(0, deltaY)
        break
      }
      case ResizeType.BOTTOM_LEFT: {
        positionDelta = new Vector(deltaX, 0)
        sizeDelta = new Vector(-deltaX, deltaY)
        break
      }
      case ResizeType.LEFT: {
        positionDelta = new Vector(deltaX, 0)
        sizeDelta = new Vector(-deltaX, 0)
        break
      }
      case ResizeType.TOP_LEFT: {
        positionDelta = new Vector(deltaX, deltaY)
        sizeDelta = new Vector(-deltaX, -deltaY)
        break
      }
    }

    if (!this.activeRequest?.options.doNotConsiderScale) {
      const scale = WorkspaceStoreWrapper.getWorkspaceState().canvasScale
      sizeDelta.div(scale)
    }

    this.oldMousePosition.x = e.clientX
    this.oldMousePosition.y = e.clientY

    if (this.activeRequest?.options.restriction?.min != null) {
      const minWidthDiff =
        this.activeRequest.options.restriction.min.width -
        this.activeRequest.element.clientWidth
      if (sizeDelta.x < minWidthDiff) {
        if (positionDelta.x !== 0) {
          positionDelta.x = -minWidthDiff
        }
        sizeDelta.x = minWidthDiff
      }
      const minHeightDiff =
        this.activeRequest.options.restriction.min.height -
        this.activeRequest.element.clientHeight
      if (sizeDelta.y < minHeightDiff) {
        if (positionDelta.y !== 0) {
          positionDelta.y = -minHeightDiff
        }
        sizeDelta.y = minHeightDiff
      }
    }

    if (this.activeRequest?.options.restriction?.max != null) {
      const maxWidthDiff =
        this.activeRequest.options.restriction.max.width -
        this.activeRequest.element.clientWidth
      if (sizeDelta.x > maxWidthDiff) {
        if (positionDelta.x !== 0) {
          positionDelta.x = -maxWidthDiff
        }
        sizeDelta.x = maxWidthDiff
      }
      const maxHeightDiff =
        this.activeRequest.options.restriction.max.height -
        this.activeRequest.element.clientHeight
      if (sizeDelta.y > maxHeightDiff) {
        if (positionDelta.y !== 0) {
          positionDelta.y = -maxHeightDiff
        }
        sizeDelta.y = maxHeightDiff
      }
    }
    this.debouncedLogging(positionDelta, sizeDelta)

    this.activeRequest?.options.eventHandler({ positionDelta, sizeDelta })
  }

  public onPointerUp(event: PixiPointerEvent): void {
    if (this.isDragging) {
      this.isDragging = false
      this.activeRequest?.options.onEnd?.(event.nativeEvent)
      this.clearCursor()
      this.activeRequest = null
      commitAction()
    } else if (this.activeRequest != null) {
      this.activeRequest.options.onClick?.(event.nativeEvent)
      this.activeRequest = null
    }
  }

  public clearCursor(): void {
    document.body.classList.remove("resizeHorizontal")
    document.body.classList.remove("resizeVertical")
    document.body.classList.remove("resizeDiagonalRight")
    document.body.classList.remove("resizeDiagonalLeft")
  }

  public addRequest(
    id: string,
    element: HTMLElement,
    options: ResizableOptions,
  ) {
    this.requests.push({ id, element, options })
  }

  public removeRequest(id: string) {
    this.requests = this.requests.filter((request) => request.id !== id)
  }
}
