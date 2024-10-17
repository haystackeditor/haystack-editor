/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import { createPortal } from "react-dom"
import {
  Orientation,
  TOOLTIP_DISTANCE,
} from "vs/workbench/browser/haystack-frontend/design_components/ui_tooltip_common"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

export interface UiTooltipProps {
  text: string
  parentElement: HTMLElement | null
  orientation: Orientation
  forceHide?: boolean
  shortcut?: string
}

export function UiTooltip({
  text,
  parentElement,
  shortcut,
  orientation,
  forceHide,
}: UiTooltipProps) {
  const getParentContainerForElement = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.getParentContainerForElement
  )
  const [tooltipContainer, setToolTipContainer] =
    React.useState<HTMLElement | null>(null)

  const documentContainer = React.useMemo(() => {
    if (parentElement == null) return null

    return getParentContainerForElement(parentElement)
  }, [parentElement])

  // This is an incredibly roundabout way of making sure the tooltip
  // displays on top of everything else (we need to prepend the tooltip
  // container).
  React.useEffect(() => {
    if (documentContainer == null) return

    const tooltipContainer = document.createElement("div")
    documentContainer.prepend(tooltipContainer)
    setToolTipContainer(tooltipContainer)

    return () => {
      documentContainer.removeChild(tooltipContainer)
      setToolTipContainer(null)
    }
  }, [documentContainer])

  if (tooltipContainer == null) return null

  return (
    <UiTooltipImpl
      text={text}
      containerElement={tooltipContainer}
      parentElement={parentElement}
      shortcut={shortcut}
      orientation={orientation}
      forceHide={forceHide}
    />
  )
}

export interface UiTooltipImplProps {
  text: string
  containerElement: HTMLElement
  parentElement: HTMLElement | null
  orientation: Orientation
  forceHide?: boolean
  shortcut?: string
}

function UiTooltipImpl({
  text,
  containerElement,
  parentElement,
  shortcut,
  orientation,
  forceHide,
}: UiTooltipImplProps) {
  const [show, setShow] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const showTooltip = React.useCallback(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current)
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

  const [tooltipStateRef, setTooltipStateRef] =
    React.useState<HTMLDivElement | null>(null)
  const tooltipRef = React.useCallback(
    (tooltipElement: HTMLDivElement) => setTooltipStateRef(tooltipElement),
    []
  )

  if (!show || forceHide || parentElement == null) {
    return null
  }

  const { x, y } = getPosition(
    parentElement.getBoundingClientRect(),
    orientation,
    tooltipStateRef
  )

  return createPortal(
    <div
      ref={tooltipRef}
      className="uiTooltip"
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
      }}
    >
      {text}
      {shortcut && <span className="shortcut">{shortcut}</span>}
    </div>,
    containerElement
  )
}

function getPosition(
  rect: DOMRect,
  orientation: Orientation,
  tooltipElement: HTMLDivElement | null
): { x: number; y: number } {
  let x = rect.left
  let y = rect.top

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
      y += tooltipElement?.clientHeight || 0 / 2
      break
    case Orientation.LEFT:
      x -= tooltipElement?.clientWidth || 0
      x -= TOOLTIP_DISTANCE
      y += rect.height / 2
      y += tooltipElement?.clientHeight || 0 / 2
      break
  }

  return { x, y }
}
