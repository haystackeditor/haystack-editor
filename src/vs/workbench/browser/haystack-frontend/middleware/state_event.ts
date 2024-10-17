/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { CanvasEditor } from "vs/workbench/browser/haystack-frontend/editor/editor"

export const enum StateEventType {
  EDITOR_CHANGE = 0,
  SCALE_CHANGE = 1,
  CAMERA_CHANGE = 2,
  SELECTION_CHANGE = 3,
  FOCUS_CHANGE = 4,
}

export interface EditorStateEvent {
  type: StateEventType.EDITOR_CHANGE
  previousData: Map<string, CanvasEditor>
  currentData: Map<string, CanvasEditor>
}

export interface ScaleStateEvent {
  type: StateEventType.SCALE_CHANGE
  previousData: number
  currentData: number
}

export interface CameraStateEvent {
  type: StateEventType.CAMERA_CHANGE
  previousData: Vector
  currentData: Vector
}

export interface SelectionStateEvent {
  type: StateEventType.SELECTION_CHANGE
  previousData: Set<string>
  currentData: Set<string>
}

export interface FocusStateEvent {
  type: StateEventType.FOCUS_CHANGE
  previousData: string
  currentData: string
}

export type StateEvent =
  | EditorStateEvent
  | ScaleStateEvent
  | CameraStateEvent
  | SelectionStateEvent
  | FocusStateEvent

export function convertStateToEvent(
  state: string,
  previousData: any,
  currentData: any
): StateEvent | null {
  switch (state) {
    case "idToEditorMap": {
      return {
        type: StateEventType.EDITOR_CHANGE,
        previousData,
        currentData,
      }
    }
    case "canvasScale": {
      return {
        type: StateEventType.SCALE_CHANGE,
        previousData,
        currentData,
      }
    }
    case "camera": {
      return {
        type: StateEventType.CAMERA_CHANGE,
        previousData,
        currentData,
      }
    }
    case "selection": {
      return {
        type: StateEventType.SELECTION_CHANGE,
        previousData,
        currentData,
      }
    }
    case "editorToFocus": {
      return {
        type: StateEventType.FOCUS_CHANGE,
        previousData,
        currentData,
      }
    }
    default:
      return null
  }
}
