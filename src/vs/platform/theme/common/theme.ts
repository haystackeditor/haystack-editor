/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Color scheme used by the OS and by color themes.
 */
export enum ColorScheme {
  DARK = "dark",
  LIGHT = "light",
  HIGH_CONTRAST_DARK = "hcDark",
  HIGH_CONTRAST_LIGHT = "hcLight",
}

export function isHighContrast(scheme: ColorScheme): boolean {
  return (
    scheme === ColorScheme.HIGH_CONTRAST_DARK ||
    scheme === ColorScheme.HIGH_CONTRAST_LIGHT
  )
}

export function isDark(scheme: ColorScheme): boolean {
  return (
    scheme === ColorScheme.DARK || scheme === ColorScheme.HIGH_CONTRAST_DARK
  )
}
