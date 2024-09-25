/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import { createPortal } from "react-dom"
import {
  appContainerRef,
  overlayRef,
} from "vs/workbench/browser/haystack-frontend/root/app_common"
import {
  Orientation,
  TOOLTIP_DISTANCE,
} from "vs/workbench/browser/haystack-frontend/design_components/ui_tooltip_common"

export interface TooltipProps {
  text: string
  parentElement: HTMLElement | null
  orientation: Orientation
  forceHide?: boolean
  shortcut?: string
}

export function CanvasTooltip({
  text,
  parentElement,
  shortcut,
  orientation,
  forceHide,
}: TooltipProps) {
  const [show, setShow] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const [appBoundingRect, setAppBoundingRect] = React.useState<DOMRect | null>(
    null,
  )

  const showTooltip = React.useCallback(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current)
    }

    if (appBoundingRect == null) {
      // Tries to set the bounding rect if it never got set.
      // This can happen if the tooltip is the child of an element 
      // high up in the DOM.
      setAppBoundingRect(
        appContainerRef.current?.getBoundingClientRect() ?? null,
      )
    }

    timeoutRef.current = setTimeout(() => {
      setShow(true)
    }, 250)
  }, [])

  const hideTooltip = React.useCallback(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current)
    }
    setShow(false)
  }, [])

  React.useEffect(() => {
    parentElement?.addEventListener("mouseover", showTooltip)
    parentElement?.addEventListener("mouseleave", hideTooltip)

    return () => {
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current)
      }
      parentElement?.removeEventListener("mouseover", showTooltip)
      parentElement?.removeEventListener("mouseleave", hideTooltip)
    }
  }, [parentElement])

  React.useEffect(() => {
    if (appContainerRef.current == null) return null
    setAppBoundingRect(appContainerRef.current.getBoundingClientRect())
  }, [parentElement])

  const [tooltipStateRef, setTooltipStateRef] =
    React.useState<HTMLDivElement | null>(null)
  const tooltipRef = React.useCallback(
    (tooltipElement: HTMLDivElement) => setTooltipStateRef(tooltipElement),
    [],
  )

  if (!show || forceHide || parentElement == null || appBoundingRect == null) {
    return null
  }

  const { x, y } = getPosition(
    parentElement.getBoundingClientRect(),
    appBoundingRect,
    orientation,
    tooltipStateRef,
  )

  return createPortal(
    <div
      ref={tooltipRef}
      className="tooltip"
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
      }}
    >
      {text}
      {shortcut && <span className="shortcut">{` ${shortcut}`}</span>}
    </div>,
    overlayRef.current!,
  )
}

function getPosition(
  rect: DOMRect,
  appRect: DOMRect,
  orientation: Orientation,
  tooltipElement: HTMLDivElement | null,
): { x: number; y: number } {
  let x = rect.left - appRect.left
  let y = rect.top - appRect.top

  switch (orientation) {
    case Orientation.ABOVE:
      x += rect.width / 2
      x -= (tooltipElement?.clientWidth || 0) / 2
      y -= tooltipElement?.clientHeight || 0
      y -= TOOLTIP_DISTANCE
      break
    case Orientation.BELOW:
      x += rect.width / 2
      x -= (tooltipElement?.clientWidth || 0) / 2
      y += rect.height
      y += TOOLTIP_DISTANCE
      break
    case Orientation.RIGHT:
      x += rect.width
      x += TOOLTIP_DISTANCE
      y += rect.height / 2
      y -= (tooltipElement?.clientHeight || 0) / 2
      break
    case Orientation.LEFT:
      x -= tooltipElement?.clientWidth || 0
      x -= rect.width / 2
      x -= TOOLTIP_DISTANCE
      y += rect.height / 2
      y -= (tooltipElement?.clientHeight || 0) / 2
      break
  }

  return { x, y }
}
