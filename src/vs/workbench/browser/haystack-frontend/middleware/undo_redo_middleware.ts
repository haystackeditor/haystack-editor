/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import {
  StateEvent,
  StateEventType,
} from "vs/workbench/browser/haystack-frontend/middleware/state_event"
import { Middleware, MiddlewareType } from "./middleware_common"
import { UndoRedoBuffer } from "vs/workbench/browser/haystack-frontend/middleware/undo_redo_buffer"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import {
  CanvasEditor,
  CanvasEditorType,
  EditorBase,
} from "vs/workbench/browser/haystack-frontend/editor/editor"

export class UndoRedoMiddleware implements Middleware {
  public middlewareType = MiddlewareType.UNDO_REDO

  private isUndoingOrRedoing = false
  private undoRedoBuffer = new UndoRedoBuffer()

  constructor() {}

  public handleStoreChange(event: StateEvent) {
    if (this.isUndoingOrRedoing || event.previousData === event.currentData) {
      return
    }

    switch (event.type) {
      case StateEventType.EDITOR_CHANGE: {
        if (this.isNoop(event.previousData, event.currentData)) return

        this.undoRedoBuffer.push({ idToEditorMap: event.previousData })
        break
      }
      // case StateEventType.SELECTION_CHANGE: {
      //   this.undoRedoBuffer.push({ selection: event.previousData })
      //   break
      // }
      // case StateEventType.FOCUS_CHANGE: {
      //   this.undoRedoBuffer.push({ editorToFocus: event.previousData })
      //   break
      // }
    }
  }

  public handleUndo() {
    this.isUndoingOrRedoing = true
    const undoState = this.undoRedoBuffer.undo()
    if (undoState != null) {
      const idToEditorMap = undoState.idToEditorMap
      if (idToEditorMap != null) {
        this.filterGhostAndReferenceEditors(idToEditorMap)
      }
      // Close editor editors that have been removed.
      const currentIdToEditorMap =
        WorkspaceStoreWrapper.getWorkspaceState().idToEditorMap

      if (idToEditorMap != null) {
        for (const [editorId, editor] of currentIdToEditorMap.entries()) {
          if (
            !idToEditorMap?.has(editorId) &&
            (editor.type === CanvasEditorType.CODE_EDITOR ||
              editor.type === CanvasEditorType.DIFF_EDITOR ||
              editor.type === CanvasEditorType.MODAL_EDITOR ||
              editor.type === CanvasEditorType.GHOST_EDITOR) &&
            editor.identifier != null
          ) {
            WorkspaceStoreWrapper.getWorkspaceState().closeFileEditor(
              editor.identifier,
            )
          }
        }
      }
      WorkspaceStoreWrapper.setWorkspaceState({ ...undoState })
    }
    this.isUndoingOrRedoing = false
  }

  public handleRedo() {
    this.isUndoingOrRedoing = true
    const redoState = this.undoRedoBuffer.redo()
    if (redoState != null) {
      const idToEditorMap = redoState.idToEditorMap
      if (idToEditorMap != null) {
        this.filterGhostAndReferenceEditors(idToEditorMap)
      }
      WorkspaceStoreWrapper.setWorkspaceState({ ...redoState })
    }
    this.isUndoingOrRedoing = false
  }

  public commit() {
    this.undoRedoBuffer.commit()
  }

  public setTrackChanges(trackChanges: boolean) {
    this.undoRedoBuffer.setTrackChanges(trackChanges)
  }

  private filterGhostAndReferenceEditors(
    idToEditorMap: Map<string, CanvasEditor>,
  ) {
    const filterededitorIds = []
    for (const [editorId, canvasEditor] of idToEditorMap.entries()) {
      if (
        canvasEditor.isGhost ||
        canvasEditor.type === CanvasEditorType.REFERENCES_EDITOR
      ) {
        filterededitorIds.push(editorId)
      }
    }
    for (const editorId of filterededitorIds) {
      idToEditorMap.delete(editorId)
    }
  }

  private isNoop(
    previousData: Map<string, CanvasEditor>,
    currentData: Map<string, CanvasEditor>,
  ): boolean {
    if (previousData.size !== currentData.size) {
      return false
    }

    for (const [key, value] of previousData.entries()) {
      if (!currentData.has(key)) return false

      const currentValue = currentData.get(key)!
      if (
        currentValue.xPosition !== value.xPosition ||
        currentValue.yPosition !== value.yPosition ||
        currentValue.width !== value.width ||
        currentValue.height !== value.height ||
        currentValue.type !== value.type ||
        (currentValue as EditorBase).identifier !==
          (value as EditorBase).identifier
      ) {
        return false
      }
    }

    return true
  }
}
