/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./file_editor"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { ShowAllCommandsAction } from "vs/workbench/contrib/quickaccess/browser/commandsQuickAccess"
import { GotoSymbolAction } from "vs/editor/standalone/browser/quickAccess/standaloneGotoSymbolQuickAccess"
import * as Constants from "vs/workbench/contrib/search/common/constants"
import {
  FocusOnCanvasAction,
  FocusOnEditorContainerAction,
  GoBackInSelectionAction,
  GoDownOneLevelAction,
  GoForwardInSelectionAction,
  GoToDeepestSymbolAction,
  GoToFileAction,
  GoUpOneLevelAction,
  PinCurrentEditorAction,
  ViewIncomingDependenciesAction,
  ViewOutgoingDependenciesAction,
} from "vs/editor/contrib/haystack/haystackActions"
import {
  NavigateBackwardsAction,
  NavigateForwardAction,
} from "vs/workbench/browser/parts/editor/editorActions"
import { KeybindingLabel } from "vs/base/browser/ui/keybindingLabel/keybindingLabel"
import { OS } from "vs/base/common/platform"
import { KeyCodeChord, ScanCodeChord } from "vs/base/common/keybindings"
import { KeyCode, ScanCode } from "vs/base/common/keyCodes"
import { concatenateClassNames } from "vs/workbench/browser/haystack-frontend/react_utils/concatenate_class_names"
import { HEADER_HEIGHT } from "vs/workbench/browser/haystack-frontend/editor/editor_header"

const enum KeybindingMetadataType {
  COMMAND = 0,
  SHORTCUT = 1,
}

type CommandKeybindingMetadata = {
  name: string
  type: KeybindingMetadataType.COMMAND
  command: string
  isEditable: true
}

type ShortcutKeybindingMetadata = {
  name: string
  type: KeybindingMetadataType.SHORTCUT
  scanCodeChords: ScanCodeChord[]
  keyChords: KeyCodeChord[]
  isEditable: false
}

type KeybindingMetadata = CommandKeybindingMetadata | ShortcutKeybindingMetadata

const GlobalKeybindings: KeybindingMetadata[] = [
  {
    name: "All Commands",
    type: KeybindingMetadataType.COMMAND,
    command: ShowAllCommandsAction.ID,
    isEditable: true,
  },
  {
    name: "Open File Picker",
    type: KeybindingMetadataType.COMMAND,
    command: "workbench.action.quickOpen",
    isEditable: true,
  },
  {
    name: "Open Symbol Picker",
    type: KeybindingMetadataType.COMMAND,
    command: GotoSymbolAction.ID,
    isEditable: true,
  },
  {
    name: "Open Symbol in Workspace",
    type: KeybindingMetadataType.COMMAND,
    command: Constants.SearchCommandIds.ShowAllSymbolsActionId,
    isEditable: true,
  },
  {
    name: "Enter Editor",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(true, false, false, false, ScanCode.Digit0),
      new ScanCodeChord(true, false, false, false, ScanCode.Digit1),
      new ScanCodeChord(true, false, false, false, ScanCode.Digit2),
      new ScanCodeChord(true, false, false, false, ScanCode.Digit3),
      new ScanCodeChord(true, false, false, false, ScanCode.Digit4),
      new ScanCodeChord(true, false, false, false, ScanCode.Digit5),
      new ScanCodeChord(true, false, false, false, ScanCode.Digit6),
      new ScanCodeChord(true, false, false, false, ScanCode.Digit7),
      new ScanCodeChord(true, false, false, false, ScanCode.Digit8),
      new ScanCodeChord(true, false, false, false, ScanCode.Digit9),
    ],
    keyChords: [
      new KeyCodeChord(false, false, false, true, KeyCode.Digit0),
      new KeyCodeChord(false, false, false, true, KeyCode.Digit1),
      new KeyCodeChord(false, false, false, true, KeyCode.Digit2),
      new KeyCodeChord(false, false, false, true, KeyCode.Digit3),
      new KeyCodeChord(false, false, false, true, KeyCode.Digit4),
      new KeyCodeChord(false, false, false, true, KeyCode.Digit5),
      new KeyCodeChord(false, false, false, true, KeyCode.Digit6),
      new KeyCodeChord(false, false, false, true, KeyCode.Digit7),
      new KeyCodeChord(false, false, false, true, KeyCode.Digit8),
      new KeyCodeChord(false, false, false, true, KeyCode.Digit9),
    ],
    isEditable: false,
  },
  {
    name: "Scroll Canvas",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(false, false, true, false, ScanCode.MouseWheel),
    ],
    keyChords: [
      new KeyCodeChord(false, false, true, false, KeyCode.MouseWheel),
    ],
    isEditable: false,
  },
  {
    name: "Navigate History Backwards",
    type: KeybindingMetadataType.COMMAND,
    command: NavigateBackwardsAction.ID,
    isEditable: true,
  },
  {
    name: "Navigate History Forwards",
    type: KeybindingMetadataType.COMMAND,
    command: NavigateForwardAction.ID,
    isEditable: true,
  },
  {
    name: "Navigate Editor History",
    type: KeybindingMetadataType.COMMAND,
    command: "workbench.action.quickOpenPreviousRecentlyUsedEditorInGroup",
    isEditable: true,
  },
  {
    name: "Navigator View",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(true, true, false, false, ScanCode.KeyK),
    ],
    keyChords: [new KeyCodeChord(false, true, false, true, KeyCode.KeyK)],
    isEditable: false,
  },
  {
    name: "Canvas Workspaces View",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(true, true, false, false, ScanCode.KeyC),
    ],
    keyChords: [new KeyCodeChord(false, true, false, true, KeyCode.KeyC)],
    isEditable: false,
  },
]

const CanvasKeybindings: KeybindingMetadata[] = [
  {
    name: "Nudge Canvas",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(false, false, false, false, ScanCode.ArrowUp),
      new ScanCodeChord(false, false, false, false, ScanCode.ArrowDown),
      new ScanCodeChord(false, false, false, false, ScanCode.ArrowLeft),
      new ScanCodeChord(false, false, false, false, ScanCode.ArrowRight),
    ],
    keyChords: [
      new KeyCodeChord(false, false, false, false, KeyCode.UpArrow),
      new KeyCodeChord(false, false, false, false, KeyCode.DownArrow),
      new KeyCodeChord(false, false, false, false, KeyCode.LeftArrow),
      new KeyCodeChord(false, false, false, false, KeyCode.RightArrow),
    ],
    isEditable: false,
  },
  {
    name: "Pan Canvas",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(false, true, false, false, ScanCode.ArrowUp),
      new ScanCodeChord(false, true, false, false, ScanCode.ArrowDown),
      new ScanCodeChord(false, true, false, false, ScanCode.ArrowLeft),
      new ScanCodeChord(false, true, false, false, ScanCode.ArrowRight),
    ],
    keyChords: [
      new KeyCodeChord(false, true, false, false, KeyCode.UpArrow),
      new KeyCodeChord(false, true, false, false, KeyCode.DownArrow),
      new KeyCodeChord(false, true, false, false, KeyCode.LeftArrow),
      new KeyCodeChord(false, true, false, false, KeyCode.RightArrow),
    ],
    isEditable: false,
  },
  {
    name: "Scale Canvas",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(true, false, false, false, ScanCode.MouseWheel),
    ],
    keyChords: [
      new KeyCodeChord(false, false, false, true, KeyCode.MouseWheel),
    ],
    isEditable: false,
  },
  {
    name: "Select All Editors",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(true, false, false, false, ScanCode.KeyA),
    ],
    keyChords: [new KeyCodeChord(false, false, false, true, KeyCode.KeyA)],
    isEditable: false,
  },
  {
    name: "Drag Select Editors",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(false, false, false, false, ScanCode.LeftMouseButton),
      new ScanCodeChord(false, false, false, false, ScanCode.MouseMove),
    ],
    keyChords: [
      new KeyCodeChord(false, false, false, false, KeyCode.LeftMouseButton),
      new KeyCodeChord(false, false, false, false, KeyCode.MouseMove),
    ],
    isEditable: false,
  },
  {
    name: "Mouse Pan Canvas",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(false, false, false, false, ScanCode.MiddleMouseButton),
      new ScanCodeChord(false, false, false, false, ScanCode.MouseMove),
    ],
    keyChords: [
      new KeyCodeChord(false, false, false, false, KeyCode.MiddleMouseButton),
      new KeyCodeChord(false, false, false, false, KeyCode.MouseMove),
    ],
    isEditable: false,
  },
]

const EditorContainerKeybindings: KeybindingMetadata[] = [
  {
    name: "Nudge Container",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(false, false, false, false, ScanCode.ArrowUp),
      new ScanCodeChord(false, false, false, false, ScanCode.ArrowDown),
      new ScanCodeChord(false, false, false, false, ScanCode.ArrowLeft),
      new ScanCodeChord(false, false, false, false, ScanCode.ArrowRight),
    ],
    keyChords: [
      new KeyCodeChord(false, false, false, false, KeyCode.UpArrow),
      new KeyCodeChord(false, false, false, false, KeyCode.DownArrow),
      new KeyCodeChord(false, false, false, false, KeyCode.LeftArrow),
      new KeyCodeChord(false, false, false, false, KeyCode.RightArrow),
    ],
    isEditable: false,
  },
  {
    name: "Move Container",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(false, true, false, false, ScanCode.ArrowUp),
      new ScanCodeChord(false, true, false, false, ScanCode.ArrowDown),
      new ScanCodeChord(false, true, false, false, ScanCode.ArrowLeft),
      new ScanCodeChord(false, true, false, false, ScanCode.ArrowRight),
    ],
    keyChords: [
      new KeyCodeChord(false, true, false, false, KeyCode.UpArrow),
      new KeyCodeChord(false, true, false, false, KeyCode.DownArrow),
      new KeyCodeChord(false, true, false, false, KeyCode.LeftArrow),
      new KeyCodeChord(false, true, false, false, KeyCode.RightArrow),
    ],
    isEditable: false,
  },
  {
    name: "Nudge Resize Container",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(true, false, false, false, ScanCode.ArrowUp),
      new ScanCodeChord(true, false, false, false, ScanCode.ArrowDown),
      new ScanCodeChord(true, false, false, false, ScanCode.ArrowLeft),
      new ScanCodeChord(true, false, false, false, ScanCode.ArrowRight),
    ],
    keyChords: [
      new KeyCodeChord(false, false, false, true, KeyCode.UpArrow),
      new KeyCodeChord(false, false, false, true, KeyCode.DownArrow),
      new KeyCodeChord(false, false, false, true, KeyCode.LeftArrow),
      new KeyCodeChord(false, false, false, true, KeyCode.RightArrow),
    ],
    isEditable: false,
  },
  {
    name: "Resize Container",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(true, true, false, false, ScanCode.ArrowUp),
      new ScanCodeChord(true, true, false, false, ScanCode.ArrowDown),
      new ScanCodeChord(true, true, false, false, ScanCode.ArrowLeft),
      new ScanCodeChord(true, true, false, false, ScanCode.ArrowRight),
    ],
    keyChords: [
      new KeyCodeChord(false, true, false, true, KeyCode.UpArrow),
      new KeyCodeChord(false, true, false, true, KeyCode.DownArrow),
      new KeyCodeChord(false, true, false, true, KeyCode.LeftArrow),
      new KeyCodeChord(false, true, false, true, KeyCode.RightArrow),
    ],
    isEditable: false,
  },
  {
    name: "Focus on Editor",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(false, false, false, false, ScanCode.Enter),
    ],
    keyChords: [new KeyCodeChord(false, false, false, false, KeyCode.Enter)],
    isEditable: false,
  },
  {
    name: "Delete Editor",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(false, false, false, false, ScanCode.Delete),
      new ScanCodeChord(false, false, false, false, ScanCode.Backspace),
    ],
    keyChords: [
      new KeyCodeChord(false, false, false, false, KeyCode.Delete),
      new KeyCodeChord(false, false, false, false, KeyCode.Backspace),
    ],
    isEditable: false,
  },
  {
    name: "Focus on Canvas",
    type: KeybindingMetadataType.COMMAND,
    command: FocusOnCanvasAction.ID,
    isEditable: true,
  },
  {
    name: "Focus Next Container",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(false, false, false, false, ScanCode.Tab),
    ],
    keyChords: [new KeyCodeChord(false, false, false, false, KeyCode.Tab)],
    isEditable: false,
  },
]

const EditorKeybindings: KeybindingMetadata[] = [
  {
    name: "Pin/Unpin Editor",
    type: KeybindingMetadataType.COMMAND,
    command: PinCurrentEditorAction.ID,
    isEditable: true,
  },
  {
    name: "Focus on Container",
    type: KeybindingMetadataType.COMMAND,
    command: FocusOnEditorContainerAction.ID,
    isEditable: true,
  },
  {
    name: "Close Editor",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(true, false, false, false, ScanCode.KeyW),
      new ScanCodeChord(false, false, true, false, ScanCode.F4),
    ],
    keyChords: [new KeyCodeChord(false, false, false, true, KeyCode.KeyW)],
    isEditable: false,
  },
  {
    name: "Jump to Previous Selection",
    type: KeybindingMetadataType.COMMAND,
    command: GoBackInSelectionAction.ID,
    isEditable: true,
  },
  {
    name: "Jump to Next Selection",
    type: KeybindingMetadataType.COMMAND,
    command: GoForwardInSelectionAction.ID,
    isEditable: true,
  },
  {
    name: "View One Level Down",
    type: KeybindingMetadataType.COMMAND,
    command: GoDownOneLevelAction.ID,
    isEditable: true,
  },
  {
    name: "View One Level Up",
    type: KeybindingMetadataType.COMMAND,
    command: GoUpOneLevelAction.ID,
    isEditable: true,
  },
  {
    name: "Go to File",
    type: KeybindingMetadataType.COMMAND,
    command: GoToFileAction.ID,
    isEditable: true,
  },
  {
    name: "Go to Deepest Symbol",
    type: KeybindingMetadataType.COMMAND,
    command: GoToDeepestSymbolAction.ID,
    isEditable: true,
  },
  {
    name: "View Incoming Dependencies",
    type: KeybindingMetadataType.COMMAND,
    command: ViewIncomingDependenciesAction.ID,
    isEditable: true,
  },
  {
    name: "View Outgoing Dependencies",
    type: KeybindingMetadataType.COMMAND,
    command: ViewOutgoingDependenciesAction.ID,
    isEditable: true,
  },
  {
    name: "Go to Defintion in New Editor",
    type: KeybindingMetadataType.COMMAND,
    command: "editor.action.revealDefinitionNewEditor",
    isEditable: true,
  },
  {
    name: "Go to next editor",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(true, false, true, false, ScanCode.ArrowRight),
    ],
    keyChords: [new KeyCodeChord(false, false, true, true, KeyCode.RightArrow)],
    isEditable: false,
  },
  {
    name: "Go to previous editor",
    type: KeybindingMetadataType.SHORTCUT,
    scanCodeChords: [
      new ScanCodeChord(true, false, true, false, ScanCode.ArrowLeft),
    ],
    keyChords: [new KeyCodeChord(false, false, true, true, KeyCode.LeftArrow)],
    isEditable: false,
  },
]

interface HaystackKeybindingsEditorProps {
  editorId: string
}

export const HaystackKeybindingsEditor = React.memo(
  function HaystackKeybindingsEditor({
    editorId,
  }: HaystackKeybindingsEditorProps) {
    const canvasEditor = WorkspaceStoreWrapper.useWorkspaceState((state) =>
      state.idToEditorMap.get(editorId),
    )

    return (
      <div
        className={classNames({
          fileEditor: true,
          modal: true,
          settingsEditor: true,
        })}
        style={{
          height: `${canvasEditor?.height ? canvasEditor.height - HEADER_HEIGHT : 0}px`,
        }}
      >
        <div className="settingsEditorContainer">
          <div className="settingsEditorTitle">Haystack Keybindings</div>
          <div className="settingsEditorSection">Global</div>
          <div className="settingsEditorSectionTable">
            <HaystackKeybindingsHeaderRow />
            {GlobalKeybindings.map((keybinding) => (
              <HaystackKeybindingsRow
                key={keybinding.name}
                keybindingMetadata={keybinding}
              />
            ))}
          </div>
          <div className="settingsEditorSection">When Canvas is Focused</div>
          <div className="settingsEditorSectionTable">
            <HaystackKeybindingsHeaderRow />
            {CanvasKeybindings.map((keybinding) => (
              <HaystackKeybindingsRow
                key={keybinding.name}
                keybindingMetadata={keybinding}
              />
            ))}
          </div>
          <div className="settingsEditorSection">
            When Editor Container is Focused
          </div>
          <div className="settingsEditorSectionTable">
            <HaystackKeybindingsHeaderRow />
            {EditorContainerKeybindings.map((keybinding) => (
              <HaystackKeybindingsRow
                key={keybinding.name}
                keybindingMetadata={keybinding}
              />
            ))}
          </div>
          <div className="settingsEditorSection">When Editor is Focused</div>
          <div className="settingsEditorSectionTable">
            <HaystackKeybindingsHeaderRow />
            {EditorKeybindings.map((keybinding) => (
              <HaystackKeybindingsRow
                key={keybinding.name}
                keybindingMetadata={keybinding}
              />
            ))}
          </div>
        </div>
      </div>
    )
  },
)

interface HaystackKeybindingsHeaderRowProps {}

function HaystackKeybindingsHeaderRow({}: HaystackKeybindingsHeaderRowProps) {
  return (
    <div className="haystackKeybindingsRow">
      <div
        className={concatenateClassNames([
          "haystackKeybindingsHeader",
          "haystackKeybindingsName",
        ])}
      >
        Name
      </div>
      <div
        className={concatenateClassNames([
          "haystackKeybindingsHeader",
          "haystackKeybindingsBindings",
        ])}
      >
        Keybinding
      </div>
      <div
        className={concatenateClassNames([
          "haystackKeybindingsHeader",
          "haystackKeybindingsEditable",
        ])}
      >
        Editable?
      </div>
    </div>
  )
}

interface HaystackKeybindingsRowProps {
  keybindingMetadata: KeybindingMetadata
}

function HaystackKeybindingsRow({
  keybindingMetadata,
}: HaystackKeybindingsRowProps) {
  const keybindingsRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (keybindingsRef.current == null) return

    const keybinding = new KeybindingLabel(keybindingsRef.current, OS)
    const nativeKeybinding =
      keybindingMetadata.type === KeybindingMetadataType.COMMAND
        ? WorkspaceStoreWrapper.getWorkspaceState().getKeybindingForCommand(
            keybindingMetadata.command,
          )
        : WorkspaceStoreWrapper.getWorkspaceState().getKeybindingForShortcut(
            keybindingMetadata.scanCodeChords,
            keybindingMetadata.keyChords,
          )
    keybinding.set(nativeKeybinding)

    return () => {
      keybinding.dispose()
    }
  }, [])

  return (
    <div className="haystackKeybindingsRow">
      <div className="haystackKeybindingsName">{keybindingMetadata.name}</div>
      <div className="haystackKeybindingsBindings" ref={keybindingsRef}></div>
      <div className="haystackKeybindingsEditable">
        {keybindingMetadata.isEditable ? "Yes" : "No"}
      </div>
    </div>
  )
}
