/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./design_components"

interface ButtonProps {
  label: string
  ariaLabel?: string
  onKeyDown?: (e: React.KeyboardEvent) => void
  onClick?: (e: React.MouseEvent) => void
  customStyle?: Record<string, string>
}

export function Button({
  label,
  onKeyDown,
  onClick,
  ariaLabel,
  customStyle,
}: ButtonProps) {
  return (
    <button
      onKeyDown={onKeyDown}
      onClick={onClick}
      className="button"
      tabIndex={0}
      aria-label={ariaLabel}
      style={customStyle}
    >
      {label}
    </button>
  )
}
