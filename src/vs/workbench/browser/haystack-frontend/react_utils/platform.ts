/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { WheelEvent } from "react"

type EventType = MouseEvent | KeyboardEvent | WheelEvent

export function isModifierKeypressed(e: EventType) {
  return isMacLike() ? e.metaKey : e.ctrlKey
}

export function isMacLike() {
  return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)
}

export function isIos() {
  return /(iPhone|iPod|iPad)/i.test(navigator.platform)
}
