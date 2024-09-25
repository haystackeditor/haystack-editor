/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import {
  WorkspaceState,
  WorkspaceStoreWrapper,
} from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

type UndoItem = Partial<WorkspaceState> & { timestamp: number }

export class UndoRedoBuffer {
  private currentBatch: UndoItem = { timestamp: -1 }
  private undoBuffer: UndoItem[] = []
  private redoBuffer: UndoItem[] = []
  private trackChanges = true
  private dirty = false

  public constructor() {}

  public push(args: Partial<WorkspaceState>) {
    if (!this.trackChanges) return

    const currentTimestamp = Date.now()

    if (this.dirty) {
      // Commit the current batch if it's been more than 250ms since the previous push.
      if (
        this.currentBatch.timestamp !== -1 &&
        currentTimestamp - this.currentBatch.timestamp > 250
      ) {
        this.commit()
      }
    }

    for (const [statekey, stateValue] of Object.entries(args)) {
      if (
        this.currentBatch[statekey as keyof Partial<WorkspaceState>] == null
      ) {
        this.currentBatch.timestamp = currentTimestamp
        this.dirty = true
        this.redoBuffer = []

        this.currentBatch[statekey as keyof Partial<WorkspaceState>] =
          stateValue as never
      }
    }
  }

  public commit() {
    if (!this.dirty) return
    this.undoBuffer.push(this.currentBatch)
    this.currentBatch = { timestamp: Date.now() }
    this.dirty = false
  }

  public undo() {
    if (this.dirty) {
      this.commit()
    }
    const nextItem = this.undoBuffer.pop()
    if (nextItem != null) {
      let redoItem: UndoItem = { timestamp: nextItem.timestamp }
      for (const stateKey of Object.keys(nextItem)) {
        const currentValue =
          WorkspaceStoreWrapper.getWorkspaceState()[
            stateKey as keyof Partial<WorkspaceState>
          ]
        // Note that this is compile-time unsafe, but should always work.
        redoItem[stateKey as keyof Partial<WorkspaceState>] =
          currentValue as never
      }
      this.redoBuffer.push(redoItem)
    }
    return nextItem
  }

  public redo() {
    const nextItem = this.redoBuffer.pop()
    if (nextItem != null) {
      let undoItem: UndoItem = { timestamp: nextItem.timestamp }
      for (const stateKey of Object.keys(nextItem)) {
        const currentValue =
          WorkspaceStoreWrapper.getWorkspaceState()[
            stateKey as keyof Partial<WorkspaceState>
          ]
        // Note that this is compile-time unsafe, but should always work.
        undoItem[stateKey as keyof Partial<WorkspaceState>] =
          currentValue as never
      }
      this.undoBuffer.push(undoItem)
    }
    return nextItem
  }

  public setTrackChanges(trackChanges: boolean) {
    this.trackChanges = trackChanges
  }
}
