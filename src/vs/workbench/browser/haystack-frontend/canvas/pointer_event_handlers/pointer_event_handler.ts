/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

export interface PixiPointerEvent {
  nativeEvent: MouseEvent
  canvasX: number
  canvasY: number
  viewportX: number
  viewportY: number
  canvasScale: number
}

export const enum PointerEventHandlerType {
  CANVAS = 0,
  DOCUMENT = 1,
}

export const enum PointerEventHandlerKind {
  HAND = 0,
  SELECTION = 1,
  MOVEMENT = 2,
  RESIZE = 3,
  CLOSE_HEADER = 4,
}

export interface PointerEventHandler {
  handlerType: PointerEventHandlerType
  handlerKind: PointerEventHandlerKind
  onPointerMove(event: PixiPointerEvent): boolean
  onPointerDown(event: PixiPointerEvent, forceAccept?: boolean): boolean
  onPointerDrag(event: PixiPointerEvent): void
  onPointerUp(event: PixiPointerEvent): void
  clearCursor(): void
}
