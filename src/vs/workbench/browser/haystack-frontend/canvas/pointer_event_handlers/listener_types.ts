/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

type PointerFunction = (e: PointerEvent) => void
type MouseFunction = (e: MouseEvent) => void
type KeyboardFunction = (e: KeyboardEvent) => void
type WheelFunction = (e: WheelEvent) => void

type PointerListener = {
  identifier: "pointerdown" | "pointerup" | "pointermove"
  listener: PointerFunction
}

type MouseListener = {
  identifier: "mousedown" | "mouseup" | "mousemove"
  listener: MouseFunction
}

type KeyboardListener = {
  identifier: "keydown" | "keyup"
  listener: KeyboardFunction
}

type WheelListener = {
  identifier: "wheel"
  listener: WheelFunction
}

type ContextMenuListener = {
  identifier: "contextmenu"
  listener: PointerFunction
}

type Listener =
  | PointerListener
  | MouseListener
  | KeyboardListener
  | WheelListener
  | ContextMenuListener

export type BoundListener = Listener & {
  options?: AddEventListenerOptions
}
