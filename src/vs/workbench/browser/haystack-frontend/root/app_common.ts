/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"

export const appContainerRef = React.createRef<HTMLDivElement>()

export const canvasRef = React.createRef<HTMLCanvasElement>()

export const overlayRef = React.createRef<HTMLDivElement>()

export function getCanvasElement(): HTMLCanvasElement | null {
  return canvasRef.current
}
