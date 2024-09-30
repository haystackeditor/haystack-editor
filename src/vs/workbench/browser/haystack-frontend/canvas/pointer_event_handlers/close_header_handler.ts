/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import {
  PointerEventHandler,
  PixiPointerEvent,
  PointerEventHandlerKind,
  PointerEventHandlerType,
} from "./pointer_event_handler"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

interface CloseHandler {
  editorId: string
  element: HTMLElement
}

export class CloseHeaderHandler implements PointerEventHandler {
  private handlers: CloseHandler[] = []

  private editorIdToClose: string | null = null

  public readonly handlerType = PointerEventHandlerType.DOCUMENT

  public readonly handlerKind = PointerEventHandlerKind.CLOSE_HEADER

  public constructor() {}

  public onPointerMove(event: PixiPointerEvent): boolean {
    return false
  }

  private hitTest(e: MouseEvent): boolean {
    for (let i = this.handlers.length - 1; i >= 0; --i) {
      const handler = this.handlers[i]
      if (!handler.element.contains(e.target as HTMLElement)) {
        continue
      }

      this.editorIdToClose = handler.editorId
      return true
    }
    return false
  }

  public onPointerDown(event: PixiPointerEvent, forceAccept: boolean): boolean {
    if (
      event.nativeEvent.button !== 1 ||
      !WorkspaceStoreWrapper.getWorkspaceState().canMiddleClickToCloseEditors()
    ) {
      return false
    }

    event.nativeEvent.preventDefault()
    event.nativeEvent.stopPropagation()

    const e = event.nativeEvent
    return this.hitTest(e)
  }

  public onPointerDrag(event: PixiPointerEvent): void {}

  public onPointerUp(event: PixiPointerEvent): void {
    // If we we have an editor ID to close and the user mouses up on the header,
    // close then editor.
    if (this.editorIdToClose == null || !this.hitTest(event.nativeEvent)) {
      return
    }

    WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
      "Header closed via middle click",
    )

    WorkspaceStoreWrapper.getWorkspaceState().closeEditor(this.editorIdToClose)

    // Prevents certain Linux distros from executing paste.
    event.nativeEvent.preventDefault()
  }

  public clearCursor(): void {}

  public addRequest(editorId: string, element: HTMLElement) {
    this.handlers.push({ editorId, element })
  }

  public removeRequest(editorId: string) {
    this.handlers = this.handlers.filter(
      (request) => request.editorId !== editorId,
    )
  }
}
