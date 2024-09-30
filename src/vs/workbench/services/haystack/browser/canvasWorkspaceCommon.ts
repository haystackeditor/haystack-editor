/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { IEditorPartUIState } from "vs/workbench/browser/parts/editor/editorPart"

export interface CanvasWorkspace {
  name: string
  uniqueId: string
  cameraPosition: Vector
  canvasScale: number
  serializedState: IEditorPartUIState
  groupIdSet: number[]
}
