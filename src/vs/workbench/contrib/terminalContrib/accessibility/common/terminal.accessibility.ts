/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const enum TerminalAccessibilityCommandId {
  FocusAccessibleBuffer = "workbench.action.terminal.focusAccessibleBuffer",
  AccessibleBufferGoToNextCommand = "workbench.action.terminal.accessibleBufferGoToNextCommand",
  AccessibleBufferGoToPreviousCommand = "workbench.action.terminal.accessibleBufferGoToPreviousCommand",
  ScrollToBottomAccessibleView = "workbench.action.terminal.scrollToBottomAccessibleView",
  ScrollToTopAccessibleView = "workbench.action.terminal.scrollToTopAccessibleView",
}

export const defaultTerminalAccessibilityCommandsToSkipShell = [
  TerminalAccessibilityCommandId.FocusAccessibleBuffer,
]
