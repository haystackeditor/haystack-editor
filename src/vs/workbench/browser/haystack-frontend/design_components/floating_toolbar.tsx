/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./design_components"

import {
  ArrowDownSvg,
  ArrowLeftSvg,
  ArrowRightSvg,
  ArrowUpSvg,
  DeepSymbolSvg,
  FileSvg,
  GitDiffSvg,
  PinSvg,
  UnpinSvg,
} from "./floating_toolbar_icons"
import { KeyCode } from "vs/workbench/browser/haystack-frontend/canvas/keyboard_constants"
import { focusOnPixiCanvas } from "vs/workbench/browser/haystack-frontend/canvas_utils/focus_on_pixi_canvas"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { CanvasTooltip } from "vs/workbench/browser/haystack-frontend/design_components/canvas_tooltip"
import { DocumentSymbol } from "vs/editor/common/languages"
import { IRange, Range } from "vs/editor/common/core/range"
import { Orientation } from "vs/workbench/browser/haystack-frontend/design_components/ui_tooltip_common"
import {
  CanvasCodeEditor,
  CanvasDiffEditor,
  CanvasEditor,
  CanvasEditorType,
  CanvasGhostEditor,
} from "vs/workbench/browser/haystack-frontend/editor/editor"

const FLOATING_TOOLBAR_TOP_MARGIN = 10

const FLOATING_TOOLBAR_HEIGHT = 20

const enum FloatingToolbarCommandType {
  GO_DOWN_ONE_LEVEL = 0,
  GO_UP_ONE_LEVEL = 1,
  GO_TO_FILE = 2,
  GO_TO_DEEPEST_SYMBOL = 3,
  GET_DIFF = 4,
  GO_BACK_IN_SELECTION = 5,
  GO_FORWARD_IN_SELECTION = 6,
  PIN_EDITOR = 7,
  UNPIN_EDITOR = 8,
}

interface FloatingToolbarCommand {
  commandType: FloatingToolbarCommandType
  identifier: string
  text: string
  commandId: string
}

interface FloatingToolbarCommandWithShortcut {
  shortcut: string | undefined
  commandData: FloatingToolbarCommand
}

const GoDownOneLevelCommand: FloatingToolbarCommand = {
  commandType: FloatingToolbarCommandType.GO_DOWN_ONE_LEVEL,
  identifier: "Go down one level",
  text: "View one level down",
  commandId: "editor.action.goDownOneLevel",
}

const GoUpOneLevelCommand: FloatingToolbarCommand = {
  commandType: FloatingToolbarCommandType.GO_UP_ONE_LEVEL,
  identifier: "Go up one level",
  text: "View one level up",
  commandId: "editor.action.goUpOneLevel",
}

const GoToFileCommand: FloatingToolbarCommand = {
  commandType: FloatingToolbarCommandType.GO_TO_FILE,
  identifier: "Go to file",
  text: "View file",
  commandId: "editor.action.goToFile",
}

const GoToDeepestSymbol: FloatingToolbarCommand = {
  commandType: FloatingToolbarCommandType.GO_TO_DEEPEST_SYMBOL,
  identifier: "Go to deepest symbol",
  text: "View deepest level",
  commandId: "editor.action.goToDeepestSymbol",
}

const GoBackInSelection: FloatingToolbarCommand = {
  commandType: FloatingToolbarCommandType.GO_BACK_IN_SELECTION,
  identifier: "Go back in selection",
  text: "Jump to previous selection",
  commandId: "editor.action.goBackInSelection",
}

const GoForwardInSelection: FloatingToolbarCommand = {
  commandType: FloatingToolbarCommandType.GO_FORWARD_IN_SELECTION,
  identifier: "Go forward in selection",
  text: "Jump to next selection",
  commandId: "editor.action.goForwardInSelection",
}

const PinEditor: FloatingToolbarCommand = {
  commandType: FloatingToolbarCommandType.PIN_EDITOR,
  identifier: "Pin editor",
  text: "Pin editor",
  commandId: "editor.action.pinCurrentEditor",
}

const UnpinEditor: FloatingToolbarCommand = {
  commandType: FloatingToolbarCommandType.UNPIN_EDITOR,
  identifier: "Unpin editor",
  text: "Unpin editor",
  // Note we use the same shortcut for pin.
  commandId: "editor.action.pinCurrentEditor",
}

// const GetDiff: FloatingToolbarCommand = {
//   commandType: FloatingToolbarCommandType.GET_DIFF,
//   identifier: "Get diff",
//   text: "View diff of symbol editor",
//   commandId: "editor.action.getDiff",
// }

const AVAILABLE_COMMANDS = [
  GoBackInSelection,
  GoForwardInSelection,
  GoToFileCommand,
  GoDownOneLevelCommand,
  GoUpOneLevelCommand,
  GoToDeepestSymbol,
  PinEditor,
  UnpinEditor,
  // GetDiff,
]

interface FloatingToolbarProps {}

export function FloatingToolbar({}: FloatingToolbarProps) {
  const idToEditorMap = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.idToEditorMap,
  )

  const selection: Set<string> = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.selection,
  )

  const [symbolStack, setSymbolStack] = React.useState<DocumentSymbol[] | null>(
    null,
  )

  const editorSingleton = React.useMemo(() => {
    if (selection.size !== 1) return null
    // Single iteration.
    for (const editorId of selection.values()) {
      return idToEditorMap.get(editorId)
    }
    return null
  }, [selection, idToEditorMap])

  React.useEffect(() => {
    async function getSymbolStack() {
      if (editorSingleton == null) return
      const symbolStack =
        await WorkspaceStoreWrapper.getWorkspaceState().getSymbolStack(
          editorSingleton,
        )
      setSymbolStack(symbolStack)
    }

    getSymbolStack()
  }, [editorSingleton])

  const [previousEditorSelectionStack, nextEditorSelectionStack] =
    WorkspaceStoreWrapper.useWorkspaceState((state) => [
      state.previousEditorSelectionHistoryMap.get(
        editorSingleton?.uuid ?? "",
      ) ?? [],
      state.nextEditorSelectionHistoryMap.get(editorSingleton?.uuid ?? "") ??
        [],
    ])

  if (
    editorSingleton == null ||
    (editorSingleton.type !== CanvasEditorType.CODE_EDITOR &&
      (editorSingleton.type !== CanvasEditorType.GHOST_EDITOR ||
        editorSingleton.isGhost))
  ) {
    return null
  }

  if (symbolStack == null) return null

  let commands: FloatingToolbarCommandWithShortcut[] = []

  for (const availableCommand of AVAILABLE_COMMANDS) {
    if (
      shouldDisplayCommand(
        availableCommand,
        editorSingleton,
        symbolStack,
        previousEditorSelectionStack,
        nextEditorSelectionStack,
      )
    ) {
      commands.push({
        commandData: availableCommand,
        shortcut:
          WorkspaceStoreWrapper.getWorkspaceState()
            .getKeybindingForCommand(availableCommand.commandId)
            ?.getLabel() ?? undefined,
      })
    }
  }

  if (commands.length === 0) return null

  return (
    <FloatingToolbarImpl selectedEditor={editorSingleton} commands={commands} />
  )
}

interface FloatingToolbarImplProps {
  selectedEditor: CanvasEditor
  commands: FloatingToolbarCommandWithShortcut[]
}

function FloatingToolbarImpl({
  selectedEditor: selectedEditor,
  commands,
}: FloatingToolbarImplProps) {
  const editorPosition = WorkspaceStoreWrapper.useWorkspaceState((state) =>
    state.getEditorPosition(selectedEditor.uuid),
  )
  const scale = WorkspaceStoreWrapper.useWorkspaceState(
    (state) => state.canvasScale,
  )
  const [activeIndex, setActiveIndex] = React.useState<number>(0)
  const [containerElement, setContainerElement] =
    React.useState<HTMLDivElement | null>(null)
  const containerRef = React.useCallback((containerElement: HTMLDivElement) => {
    setContainerElement(containerElement)
    WorkspaceStoreWrapper.getWorkspaceState().setFloatingToolbarElement(
      containerElement,
    )
  }, [])

  React.useEffect(() => {
    return () => {
      WorkspaceStoreWrapper.getWorkspaceState().setFloatingToolbarElement(null)
    }
  }, [])

  const adjustedScale = selectedEditor.isPinned ? 1 : scale
  const toolbarWidth = containerElement?.clientWidth ?? 0
  const xPosition =
    editorPosition.x +
    ((selectedEditor.isPinned ? selectedEditor.vWidth : selectedEditor.width) /
      2) *
      adjustedScale -
    (toolbarWidth / 2) * adjustedScale
  const yPosition =
    editorPosition.y -
    FLOATING_TOOLBAR_TOP_MARGIN * adjustedScale -
    FLOATING_TOOLBAR_HEIGHT * adjustedScale

  const buttonRefs: React.RefObject<HTMLButtonElement | null>[] = []
  for (let i = 0; i < commands.length; i++) {
    buttonRefs.push(React.createRef<HTMLButtonElement | null>())
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.code) {
      case KeyCode.ESCAPE:
        focusOnPixiCanvas()
        break
      case KeyCode.ENTER:
        executeCommand(
          selectedEditor,
          commands[activeIndex].commandData.commandType,
        )
        focusOnPixiCanvas()
        e.preventDefault()
        break
      case KeyCode.ARROW_UP:
      case KeyCode.ARROW_RIGHT:
        setActiveIndex(
          activeIndex === 0 ? commands.length - 1 : activeIndex - 1,
        )
        e.preventDefault()
        break
      case KeyCode.ARROW_DOWN:
      case KeyCode.ARROW_LEFT:
        setActiveIndex(
          activeIndex === commands.length - 1 ? 0 : activeIndex + 1,
        )
        e.preventDefault()
    }
  }

  return (
    <div
      style={{
        transform: `translate(${xPosition}px, ${yPosition}px) scale(${adjustedScale})`,
      }}
      className="floatingToolbar"
      tabIndex={0}
      onKeyDown={onKeyDown}
      ref={containerRef}
    >
      {commands.map((command) => {
        return (
          <FloatingToolbarButton
            selectedEditor={selectedEditor}
            command={command}
            key={command.commandData.identifier}
          />
        )
      })}
    </div>
  )
}

interface FloatingToolbarButtonProps {
  selectedEditor: CanvasEditor
  command: FloatingToolbarCommandWithShortcut
}

function FloatingToolbarButton({
  selectedEditor: selectedEditor,
  command,
}: FloatingToolbarButtonProps) {
  const buttonRef = React.useRef<HTMLButtonElement | null>(null)

  return (
    <button
      className="floatingToolbarCommandButton"
      onClick={() => {
        executeCommand(selectedEditor, command.commandData.commandType)
      }}
      key={command.commandData.identifier}
      ref={buttonRef}
    >
      <CanvasTooltip
        text={command.commandData.text}
        parentElement={buttonRef.current}
        orientation={Orientation.ABOVE}
        shortcut={command.shortcut}
      />
      {getIconForCommand(command.commandData.commandType)}
    </button>
  )
}

function getIconForCommand(commandType: FloatingToolbarCommandType) {
  switch (commandType) {
    case FloatingToolbarCommandType.GO_BACK_IN_SELECTION: {
      return <ArrowLeftSvg />
    }
    case FloatingToolbarCommandType.GO_FORWARD_IN_SELECTION: {
      return <ArrowRightSvg />
    }
    case FloatingToolbarCommandType.GO_UP_ONE_LEVEL: {
      return <ArrowUpSvg />
    }
    case FloatingToolbarCommandType.GO_DOWN_ONE_LEVEL: {
      return <ArrowDownSvg />
    }
    case FloatingToolbarCommandType.GO_TO_FILE: {
      return <FileSvg />
    }
    case FloatingToolbarCommandType.GO_TO_DEEPEST_SYMBOL: {
      return <DeepSymbolSvg />
    }
    case FloatingToolbarCommandType.GET_DIFF: {
      return <GitDiffSvg />
    }
    case FloatingToolbarCommandType.PIN_EDITOR: {
      return <PinSvg />
    }
    case FloatingToolbarCommandType.UNPIN_EDITOR: {
      return <UnpinSvg />
    }
    default: {
      return null
    }
  }
}

async function executeCommand(
  selectedEditor: CanvasEditor,
  commandType: FloatingToolbarCommandType,
) {
  if (
    selectedEditor.type !== CanvasEditorType.CODE_EDITOR &&
    selectedEditor.type !== CanvasEditorType.GHOST_EDITOR
  ) {
    return
  }

  switch (commandType) {
    case FloatingToolbarCommandType.GO_BACK_IN_SELECTION: {
      WorkspaceStoreWrapper.getWorkspaceState().goToPreviousEditorSelection(
        selectedEditor.uuid,
      )
      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
        "floating toolbar used to go back in selection",
      )
      break
    }
    case FloatingToolbarCommandType.GO_FORWARD_IN_SELECTION: {
      WorkspaceStoreWrapper.getWorkspaceState().goToNextEditorSelection(
        selectedEditor.uuid,
      )
      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
        "floating toolbar used to go forward in selection",
      )
      break
    }
    case FloatingToolbarCommandType.GO_UP_ONE_LEVEL: {
      if (selectedEditor.editRange == null) return
      WorkspaceStoreWrapper.getWorkspaceState().editorGoUpOneLevel(
        selectedEditor,
      )
      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
        "floating toolbar used to go up one level",
      )
      break
    }
    case FloatingToolbarCommandType.GO_DOWN_ONE_LEVEL: {
      WorkspaceStoreWrapper.getWorkspaceState().editorGoDownOneLevel(
        selectedEditor,
      )
      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
        "floating toolbar used to go down one level",
      )
      break
    }
    case FloatingToolbarCommandType.GO_TO_FILE: {
      WorkspaceStoreWrapper.getWorkspaceState().editorGoToFile(selectedEditor)
      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
        "floating toolbar used to go to file",
      )
      break
    }
    case FloatingToolbarCommandType.GO_TO_DEEPEST_SYMBOL: {
      WorkspaceStoreWrapper.getWorkspaceState().editorGoToDeepestSymbol(
        selectedEditor,
      )
      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
        "floating toolbar used to go to deepest symbol",
      )
      break
    }
    case FloatingToolbarCommandType.PIN_EDITOR: {
      WorkspaceStoreWrapper.getWorkspaceState().pinCurrentEditor()
      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
        "pin editor button clicked",
      )
      break
    }
    case FloatingToolbarCommandType.UNPIN_EDITOR: {
      WorkspaceStoreWrapper.getWorkspaceState().unpinCurrentEditor()
      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
        "unpin editor button clicked",
      )
      break
    }
    case FloatingToolbarCommandType.GET_DIFF: {
      //     const rangeData = WorkspaceStoreWrapper.getWorkspaceState().getRangeDataForSelectedEditor()
      //     if (rangeData == null) return
      //     if (rangeData.dataType === SourceCodeDataType.FILE) {
      //         const fileDirs = getGlobalState().fileDirs
      //         const filePath = fileDirs[rangeData.fileDirIndex].filePath
      //         WorkspaceStoreWrapper.getWorkspaceState().insertAdjacentEditor(rangeData.editorId, {
      //             type: CanvasEditorType.DIFF_EDITOR,
      //             fileDirIndex: rangeData.fileDirIndex,
      //             filePath,
      //         }, /* selectAndFocusEditor */ false)
      //     } else {
      //         const symbolData =
      //             await rendererMessenger.getSymbolDataForIndex(rangeData.symbolIndex)
      //         WorkspaceStoreWrapper.getWorkspaceState().insertAdjacentEditor(rangeData.editorId, {
      //             type: CanvasEditorType.SYMBOL_DIFF_EDITOR,
      //             symbolId: symbolData.symbolIndex,
      //             symbolType: symbolData.symbolType,
      //             symbolName: symbolData.symbolName,
      //             parentSymbolPtr: symbolData.parentSymbolPtr,
      //             filePath: symbolData.filePath,
      //             filePtr: symbolData.filePtr,
      //             rowOffset: symbolData.rowOffset,
      //             colOffset: symbolData.colOffset,
      //             rowByteOffset: symbolData.rowByteOffset,
      //             rowEnd: symbolData.rowEnd,
      //         }, /* selectAndFocusEditor */ false)
      //     }
      //     break
    }
  }
}

function shouldDisplayCommand(
  command: FloatingToolbarCommand,
  editor: CanvasCodeEditor | CanvasDiffEditor | CanvasGhostEditor,
  symbolStack: DocumentSymbol[],
  previousEditorSelectionStack: IRange[],
  nextEditorSelectionStack: IRange[],
): boolean {
  switch (command.commandType) {
    case FloatingToolbarCommandType.GO_BACK_IN_SELECTION: {
      return previousEditorSelectionStack.length > 0
    }
    case FloatingToolbarCommandType.GO_FORWARD_IN_SELECTION: {
      return nextEditorSelectionStack.length > 0
    }
    case FloatingToolbarCommandType.GO_TO_FILE: {
      return editor.editRange != null
    }
    case FloatingToolbarCommandType.GO_UP_ONE_LEVEL: {
      return editor.editRange != null
    }
    case FloatingToolbarCommandType.GO_DOWN_ONE_LEVEL:
    case FloatingToolbarCommandType.GO_TO_DEEPEST_SYMBOL: {
      if (symbolStack.length === 0) return false

      if (editor.editRange == null) return true

      return Range.strictContainsRange(
        editor.editRange,
        symbolStack[symbolStack.length - 1]!.range,
      )
    }
    case FloatingToolbarCommandType.PIN_EDITOR: {
      return !editor.isPinned
    }
    case FloatingToolbarCommandType.UNPIN_EDITOR: {
      return editor.isPinned
    }
  }
  return false
}
