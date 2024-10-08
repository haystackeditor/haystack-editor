/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import {
  Container,
  TilingSprite,
  Assets,
  Graphics,
  Texture,
  Resource,
} from "pixi.js"
import * as workspaceMirror from "vs/workbench/browser/haystack-frontend/mirror/workspace_mirror"
import {
  IScene,
  RendererManagerInterface,
  VIEWPORT_PADDING,
} from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { BoundListener } from "vs/workbench/browser/haystack-frontend/canvas/pointer_event_handlers/listener_types"
import {
  PointerEventHandler,
  PixiPointerEvent as HaystackPointerEvent,
  PointerEventHandlerKind,
  PointerEventHandlerType,
} from "./pointer_event_handlers/pointer_event_handler"
import { ResizeHandler } from "./pointer_event_handlers/resize_handler"
import { MoveHandler } from "./pointer_event_handlers/move_handler"
import { debounce } from "vs/workbench/browser/haystack-frontend/react_utils/debounce"
import { SelectionHandler } from "./pointer_event_handlers/selection_handler"
import { HandDragHandler } from "vs/workbench/browser/haystack-frontend/canvas/pointer_event_handlers/hand_drag_handler"
import { getGlobalState } from "vs/workbench/browser/haystack-frontend/global_state/global_store"
import { UiManager } from "vs/workbench/browser/haystack-frontend/canvas/ui_manager"
import {
  isMacLike,
  isModifierKeypressed,
} from "vs/workbench/browser/haystack-frontend/react_utils/platform"
import { KeyCode } from "vs/workbench/browser/haystack-frontend/canvas/keyboard_constants"
import { commitAction } from "vs/workbench/browser/haystack-frontend/canvas_utils/commit_action"
import { focusOnPixiCanvas } from "vs/workbench/browser/haystack-frontend/canvas_utils/focus_on_pixi_canvas"
import { Rectangle } from "vs/workbench/browser/haystack-frontend/canvas/rectangle"
import { FileAccess } from "vs/base/common/network"
import { ContextMenuBarrier } from "vs/editor/contrib/contextmenu/context_menu_barrier"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import { clamp } from "vs/base/common/numbers"
import {
  MAX_CANVAS_SCALE,
  MIN_CANVAS_SCALE,
  NavigationType,
} from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import { CloseHeaderHandler } from "vs/workbench/browser/haystack-frontend/canvas/pointer_event_handlers/close_header_handler"
import {
  DependencyArrow,
  DependencyArrowType,
} from "vs/workbench/services/haystack/common/haystackService"
import { middlewareManager } from "vs/workbench/browser/haystack-frontend/middleware/middleware"
import { MiddlewareType } from "vs/workbench/browser/haystack-frontend/middleware/middleware_common"
import { UndoRedoMiddleware } from "vs/workbench/browser/haystack-frontend/middleware/undo_redo_middleware"
import { SpatialSortMiddleware } from "vs/workbench/browser/haystack-frontend/middleware/spatial_sort_middleware"

export class WorkspaceScene extends Container implements IScene {
  private currentScreenWidth: number
  private currentScreenHeight: number
  private camera = Vector.new()
  private tilePosition = Vector.new()
  private scrolling = false
  private backgroundSprite: TilingSprite = new TilingSprite()
  private dependencyArrows: Graphics[] = []
  private canvasListeners: BoundListener[] = []
  private documentListeners: BoundListener[] = []
  private previousCamera = Vector.new()
  private previousMousePosition = Vector.new()
  private lastViewportScrolledPosition = Vector.new()
  private dirty = false
  private ctrlKeyPressed = false

  private registeredPointerEventHandlers: PointerEventHandler[] = []
  private registeredTopLevelPointerEventHandlers: PointerEventHandler[] = []
  private currentPointerEventHandler: PointerEventHandler | null = null
  private resizeHandler: ResizeHandler = new ResizeHandler()
  private moveHandler: MoveHandler = new MoveHandler()
  private closeHeaderHandler: CloseHeaderHandler = new CloseHeaderHandler()

  private isHandlingContextMenu = false
  private contextMenuRequestTs = 0
  private contextMenuPointerDownPosition = Vector.new()

  private navigationTimeouts: NodeJS.Timeout[] = []

  private readonly debounceScroll = debounce(() => {
    this.scrolling = false
  }, 300)

  private scrollTelemetry = debounce(
    () =>
      WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
        "Canvas scrolled",
      ),
    1000,
  )

  private static readonly CAMERA_NUDGE = 5
  private static readonly CAMERA_SHIFT = 25
  private static readonly GESTURE_DAMPING = 0.01
  private static readonly SCROLL_DAMPING = 0.001

  constructor(private manager: RendererManagerInterface) {
    super()

    // Put the world into the center of screen.
    this.currentScreenWidth = this.manager.width
    this.currentScreenHeight = this.manager.height
    this.x = this.manager.width / 2
    this.y = this.manager.height / 2
    this.pivot.set(this.camera.x, this.camera.y)

    this.registeredPointerEventHandlers = [new SelectionHandler()]
    this.registeredTopLevelPointerEventHandlers = [
      this.closeHeaderHandler,
      this.moveHandler,
      new HandDragHandler(),
      this.resizeHandler,
    ]
    middlewareManager.registerMiddleware(MiddlewareType.SPATIAL_SORT)
    middlewareManager.registerMiddleware(MiddlewareType.UNDO_REDO)
    middlewareManager.registerMiddleware(MiddlewareType.CANVAS_WORKSPACE)
    middlewareManager.registerMiddleware(MiddlewareType.HISTORY_STACK)

    this.init()
  }

  private async init(): Promise<void> {
    const url = FileAccess.asBrowserUri(
      "vs/workbench/browser/haystack-frontend/canvas/media/Dot.png",
    ).toString(true)
    const texture = await Assets.load(url)
    // Create background sprite.
    this.backgroundSprite = new TilingSprite(
      texture as Texture<Resource>,
      this.manager.width,
      this.manager.height,
    )
    this.backgroundSprite.position.set(
      this.camera.x - this.manager.width / 2,
      this.camera.y - this.manager.height / 2,
    )
    this.backgroundSprite.tileScale.set(0.35)
    const shouldHideCanvasDots =
      await WorkspaceStoreWrapper.getWorkspaceState().getHideCanvasDots()
    if (!shouldHideCanvasDots) {
      this.addChildAt(this.backgroundSprite, 0)
    }

    const previousBackgroundWidth = this.backgroundSprite.width
    const previousBackgroundHeight = this.backgroundSprite.height
    this.updateBackgroundSpriteAfterScroll(
      previousBackgroundWidth,
      previousBackgroundHeight,
    )
    this.manager.render()
  }

  private dirtyRender(): void {
    if (this.dirty) return

    this.dirty = true

    requestAnimationFrame(() => {
      this.update()
      this.dirty = false
    })
  }

  private onWheel(e: WheelEvent): void {
    if (getGlobalState().contextMenuIsOpen()) return
    this.handleWheelEvent(e)
    e.stopPropagation()
    e.preventDefault()
  }

  public isScrolling(): boolean {
    return this.scrolling
  }

  private haystackPointerEventFromPointerEvent(
    event: PointerEvent,
    scene: Container,
  ): HaystackPointerEvent {
    const localPoint = scene.toGlobal({ x: 0, y: 0 })
    const canvasOffset = this.manager.canvasOffset()

    return {
      nativeEvent: event,
      canvasX: event.clientX - localPoint.x - canvasOffset.x,
      canvasY: event.clientY - localPoint.y - canvasOffset.y,
      viewportX: event.clientX - canvasOffset.x,
      viewportY: event.clientY - canvasOffset.y,
      canvasScale: this.scale.x,
    }
  }

  public onDocumentPointerDown(event: PointerEvent): void {
    if (
      event.target != null &&
      ((event.target as HTMLElement).closest("button") != null ||
        (event.target as HTMLElement).closest("input") != null)
    ) {
      return
    }

    const uiStage = UiManager.getUiStage()
    const pointerHandlerEvent = this.haystackPointerEventFromPointerEvent(
      event,
      uiStage,
    )

    for (const pointerHandler of this.registeredTopLevelPointerEventHandlers) {
      const forceAccept =
        event.target === this.manager.canvas &&
        pointerHandler.handlerKind === PointerEventHandlerKind.HAND &&
        event.button === 2
      if (pointerHandler.onPointerDown(pointerHandlerEvent, forceAccept)) {
        this.currentPointerEventHandler = pointerHandler
        break
      }
    }
  }

  public onPointerDown(event: PointerEvent): void {
    const uiStage = UiManager.getUiStage()
    const pointerHandlerEvent = this.haystackPointerEventFromPointerEvent(
      event,
      uiStage,
    )

    for (const pointerHandler of this.registeredPointerEventHandlers) {
      if (pointerHandler.onPointerDown(pointerHandlerEvent)) {
        this.currentPointerEventHandler = pointerHandler
        this.manager.canvas.setPointerCapture(event.pointerId)
        break
      }
    }
  }

  public onPointerMove(event: PointerEvent): void {
    if (event.buttons === 0 && this.currentPointerEventHandler) {
      this.onPointerUp(event)
      return
    }
    const uiStage = UiManager.getUiStage()
    if (
      this.currentPointerEventHandler &&
      this.currentPointerEventHandler.handlerType ===
        PointerEventHandlerType.CANVAS
    ) {
      this.currentPointerEventHandler.onPointerDrag(
        this.haystackPointerEventFromPointerEvent(event, uiStage),
      )
    } else if (this.currentPointerEventHandler == null) {
      for (const pointerHandler of this.registeredPointerEventHandlers) {
        pointerHandler.onPointerMove(
          this.haystackPointerEventFromPointerEvent(event, uiStage),
        )
      }
    }
  }

  public onPointerUp(event: PointerEvent): void {
    const uiStage = UiManager.getUiStage()
    if (this.currentPointerEventHandler) {
      this.currentPointerEventHandler.onPointerUp(
        this.haystackPointerEventFromPointerEvent(event, uiStage),
      )
      this.manager.canvas.releasePointerCapture(event.pointerId)
    }
    if (!event.altKey) {
      this.setHandMode(false)
    }
    this.currentPointerEventHandler = null
  }

  public onDocumentPointerMove(event: PointerEvent): void {
    const mousePosition = new Vector(event.pageX, event.pageY)
    this.previousMousePosition = mousePosition.copy()

    if (
      this.isHandlingContextMenu &&
      Vector.sub(
        this.previousMousePosition,
        this.contextMenuPointerDownPosition,
      ).magSquared() >= 500
    ) {
      this.isHandlingContextMenu = false
      const contextMenuBarrier = ContextMenuBarrier.getInstance()
      contextMenuBarrier.complete(false)
      this.setHandHandlerAsActiveHandler(
        this.haystackPointerEventFromPointerEvent(event, this),
      )
      return
    }

    if (
      (!this.currentPointerEventHandler &&
        event.target != null &&
        (event.target as HTMLElement).closest("button") != null) ||
      (event.target != null &&
        (event.target as HTMLElement).closest("input") != null)
    ) {
      for (const pointerHandler of this
        .registeredTopLevelPointerEventHandlers) {
        pointerHandler.clearCursor()
      }
      return
    }

    if (event.buttons === 0 && this.currentPointerEventHandler) {
      this.onDocumentPointerUp(event)
      return
    }

    const uiStage = UiManager.getUiStage()
    if (
      this.currentPointerEventHandler &&
      this.currentPointerEventHandler.handlerType ===
        PointerEventHandlerType.DOCUMENT
    ) {
      this.currentPointerEventHandler.onPointerDrag(
        this.haystackPointerEventFromPointerEvent(event, uiStage),
      )
    } else if (this.currentPointerEventHandler == null) {
      let isStylingCursor = false
      for (const pointerHandler of this
        .registeredTopLevelPointerEventHandlers) {
        if (isStylingCursor) {
          pointerHandler.clearCursor()
        } else {
          if (
            pointerHandler.onPointerMove(
              this.haystackPointerEventFromPointerEvent(event, uiStage),
            )
          ) {
            isStylingCursor = true
          }
        }
      }
    }
  }

  public onDocumentPointerUp(event: PointerEvent): void {
    const uiStage = UiManager.getUiStage()
    this.currentPointerEventHandler?.onPointerUp(
      this.haystackPointerEventFromPointerEvent(event, uiStage),
    )
    this.currentPointerEventHandler = null
  }

  private onContextMenu(event: PointerEvent): void {
    // For some reason pointer events are extremely erroneous if the user
    // currently has a context menu open. This is a workaround for this.
    if (WorkspaceStoreWrapper.getWorkspaceState().isShowingContextMenu()) {
      this.isHandlingContextMenu = false
      const contextMenuBarrier = ContextMenuBarrier.getInstance()
      contextMenuBarrier.complete(true)
      return
    }

    this.manager.canvas.setPointerCapture(event.pointerId)

    const mousePosition = new Vector(event.pageX, event.pageY)

    this.contextMenuPointerDownPosition = mousePosition.copy()
    this.previousMousePosition = mousePosition.copy()

    this.isHandlingContextMenu = true
    this.contextMenuRequestTs = Date.now()

    event.preventDefault()
    event.stopPropagation()

    window.requestAnimationFrame(this.clearContextMenu.bind(this))
  }

  private clearContextMenu(): void {
    if (!this.isHandlingContextMenu) return

    // Wait for at least 100 ms.
    const tsNow = Date.now()
    if (tsNow - this.contextMenuRequestTs < 100) {
      window.requestAnimationFrame(this.clearContextMenu.bind(this))
      return
    }

    // Informs VS Code that they should handle the context menu request.
    this.isHandlingContextMenu = false
    const contextMenuBarrier = ContextMenuBarrier.getInstance()
    contextMenuBarrier.complete(true)
  }

  private setHandHandlerAsActiveHandler(pointerEvent: HaystackPointerEvent) {
    // Set the hand pointer handler as the current pointer handler.
    for (const pointerHandler of this.registeredTopLevelPointerEventHandlers) {
      if (pointerHandler.handlerKind === PointerEventHandlerKind.HAND) {
        pointerHandler.onPointerDown(pointerEvent, /* forceAccept */ true)
        this.currentPointerEventHandler = pointerHandler
        break
      }
    }
  }

  public handleWheelEvent(e: WheelEvent): void {
    let scaleAdjX,
      scaleAdjY = 1

    const previousBackgroundWidth = this.backgroundSprite.width
    const previousBackgroundHeight = this.backgroundSprite.height
    let scaleChanged = false
    const isPinching = e.ctrlKey && !this.ctrlKeyPressed

    if (isModifierKeypressed(e) || e.ctrlKey) {
      const canvasOffset = this.manager.canvasOffset()

      this.lastViewportScrolledPosition = new Vector(
        e.clientX - canvasOffset.x,
        e.clientY - canvasOffset.y,
      )

      scaleAdjX = this.lastViewportScrolledPosition.x / this.manager.width
      scaleAdjY = this.lastViewportScrolledPosition.y / this.manager.height

      const tempPivotVector = new Vector(this.pivot.x, this.pivot.y)
      // We set the pivot temporarily so we can scale at the position of the mouse.
      this.pivot.set(
        this.lastViewportScrolledPosition.x,
        this.lastViewportScrolledPosition.y,
      )
      const dampedDelta =
        -e.deltaY *
        (isPinching
          ? WorkspaceScene.GESTURE_DAMPING
          : WorkspaceScene.SCROLL_DAMPING)
      const newScale = clamp(
        this.scale.x + dampedDelta,
        MIN_CANVAS_SCALE,
        MAX_CANVAS_SCALE,
      )
      this.scale.x = newScale
      this.scale.y = newScale
      this.pivot.set(tempPivotVector.x, tempPivotVector.y)
      scaleChanged = true
    } else if (e.shiftKey && e.deltaX === 0) {
      const deltaX = e.deltaY / this.scale.x
      this.camera.add(new Vector(deltaX, 0))
      this.pivot.set(this.camera.x, this.camera.y)
    } else {
      this.camera.add(
        new Vector(e.deltaX / this.scale.x, e.deltaY / this.scale.y),
      )
      this.pivot.set(this.camera.x, this.camera.y)
    }
    if (scaleChanged) {
      this.updateBackgroundSpriteAfterScroll(
        previousBackgroundWidth,
        previousBackgroundHeight,
        scaleAdjX,
        scaleAdjY,
      )
    }
    this.dirtyRender()
    // We want to prevent React from stealing wheel events when the user has started to scroll in the file browser.
    this.scrolling = true
    this.scrollTelemetry()
    this.debounceScroll()
  }

  private onKeyDown(e: KeyboardEvent): void {
    const cameraDelta = e.shiftKey
      ? WorkspaceScene.CAMERA_SHIFT
      : WorkspaceScene.CAMERA_NUDGE
    const deltaX = cameraDelta / this.scale.x
    const deltaY = cameraDelta / this.scale.y
    let handleEvent = true

    switch (e.code) {
      case KeyCode.ARROW_UP:
        this.camera.y -= deltaY
        this.dirtyRender()
        break
      case KeyCode.ARROW_LEFT:
        if (e.altKey && isModifierKeypressed(e)) {
          const [position, size] = workspaceMirror.goToNextEditor(-1)
          if (position != null && size != null) {
            this.navigateToPosition(position, size, NavigationType.CENTER)
            commitAction()
          }
        } else {
          this.camera.x -= deltaX
          this.dirtyRender()
        }
        break
      case KeyCode.ARROW_DOWN:
        this.camera.y += deltaY
        this.dirtyRender()
        break
      case KeyCode.ARROW_RIGHT:
        if (e.altKey && isModifierKeypressed(e)) {
          const [position, size] = workspaceMirror.goToNextEditor(1)
          if (position != null && size != null) {
            this.navigateToPosition(position, size, NavigationType.CENTER)
            commitAction()
          }
        } else {
          this.camera.x += deltaX
          this.dirtyRender()
        }
        break
      case KeyCode.TAB:
        WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
          "Tabbed to navigate",
        )
        let position: Vector | null, size: Vector | null
        if (e.shiftKey) {
          ;[position, size] = workspaceMirror.goToNextEditor(-1)
        } else {
          ;[position, size] = workspaceMirror.goToNextEditor(1)
        }
        if (position != null && size != null) {
          this.navigateToPosition(position, size, NavigationType.CENTER)
          commitAction()
        }
        break
      case KeyCode.META_LEFT:
      case KeyCode.META_RIGHT:
      case KeyCode.CTRL_LEFT:
      case KeyCode.CTRL_RIGHT: {
        this.ctrlKeyPressed =
          e.code === KeyCode.CTRL_LEFT || e.code === KeyCode.CTRL_RIGHT
        const isMac = isMacLike()
        const modifierKeyPressed =
          (isMac &&
            (e.code === KeyCode.META_LEFT || e.code === KeyCode.META_RIGHT)) ||
          (!isMac &&
            (e.code === KeyCode.CTRL_LEFT || e.code === KeyCode.CTRL_RIGHT))
        if (modifierKeyPressed) {
          WorkspaceStoreWrapper.getWorkspaceState().setIsHoldingModifier(true)
        }
        break
      }
      case KeyCode.BACKSPACE:
      case KeyCode.DELETE:
        workspaceMirror.deleteEditorsInSelection()
        focusOnPixiCanvas()
        commitAction()
        break
      case KeyCode.SLASH:
        break
      case KeyCode.ALT_LEFT:
        if (!this.currentPointerEventHandler) {
          for (const documentBehavior of this
            .registeredTopLevelPointerEventHandlers) {
            documentBehavior.clearCursor()
          }
          this.setHandMode(true)
        }
        break
      case KeyCode.A:
        if (isModifierKeypressed(e)) {
          workspaceMirror.selectAllEditors()
          commitAction()
        }
        break
      case KeyCode.Z:
        if (isModifierKeypressed(e)) {
          const undoRedoMiddleware = middlewareManager.getMiddleware(
            MiddlewareType.UNDO_REDO,
          ) as UndoRedoMiddleware
          if (undoRedoMiddleware == null) break
          if (e.shiftKey) {
            undoRedoMiddleware.handleRedo()
          } else {
            undoRedoMiddleware.handleUndo()
          }
        }
        break
      case KeyCode.W:
        break
      case KeyCode.ONE:
      case KeyCode.TWO:
      case KeyCode.THREE:
      case KeyCode.FOUR:
      case KeyCode.FIVE:
      case KeyCode.SIX:
      case KeyCode.SEVEN:
      case KeyCode.EIGHT:
      case KeyCode.NINE: {
        const number = convertKeyCodeToNumber(e.code)
        if (number == null) break

        e.stopPropagation()
        e.preventDefault()

        const spatialSortMiddleware = middlewareManager.getMiddleware(
          MiddlewareType.SPATIAL_SORT,
        ) as SpatialSortMiddleware
        const editor = spatialSortMiddleware.getNthEditorInViewport(number)
        if (editor == null) break

        WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
          "Navigated to editor using numeric keys",
        )
        WorkspaceStoreWrapper.getWorkspaceState().navigateToEditor(
          editor,
          NavigationType.JUST_ENOUGH,
        )
      }
      default:
        handleEvent = false
        break
    }
    if (handleEvent) {
      this.pivot.set(this.camera.x, this.camera.y)
      e.stopPropagation()
      e.preventDefault()
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case KeyCode.ALT_LEFT:
        this.setHandMode(false)
        break
      case KeyCode.META_LEFT:
      case KeyCode.META_RIGHT:
      case KeyCode.CTRL_LEFT:
      case KeyCode.CTRL_RIGHT: {
        const isMac = isMacLike()
        const modifierKeyPressed =
          (isMac &&
            (e.code === KeyCode.META_LEFT || e.code === KeyCode.META_RIGHT)) ||
          (!isMac &&
            (e.code === KeyCode.CTRL_LEFT || e.code === KeyCode.CTRL_RIGHT))
        if (modifierKeyPressed) {
          WorkspaceStoreWrapper.getWorkspaceState().setIsHoldingModifier(false)
        }
        break
      }
    }
  }

  private onDocumentKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case KeyCode.META_LEFT:
      case KeyCode.META_RIGHT:
      case KeyCode.CTRL_LEFT:
      case KeyCode.CTRL_RIGHT: {
        this.ctrlKeyPressed =
          e.code === KeyCode.CTRL_LEFT || e.code === KeyCode.CTRL_RIGHT
        const isMac = isMacLike()
        const modifierKeyPressed =
          (isMac &&
            (e.code === KeyCode.META_LEFT || e.code === KeyCode.META_RIGHT)) ||
          (!isMac &&
            (e.code === KeyCode.CTRL_LEFT || e.code === KeyCode.CTRL_RIGHT))
        if (modifierKeyPressed) {
          WorkspaceStoreWrapper.getWorkspaceState().setIsHoldingModifier(true)
        }
        break
      }
    }
  }

  private onDocumentKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case KeyCode.META_LEFT:
      case KeyCode.META_RIGHT:
      case KeyCode.CTRL_LEFT:
      case KeyCode.CTRL_RIGHT: {
        const isMac = isMacLike()
        const modifierKeyPressed =
          (isMac &&
            (e.code === KeyCode.META_LEFT || e.code === KeyCode.META_RIGHT)) ||
          (!isMac &&
            (e.code === KeyCode.CTRL_LEFT || e.code === KeyCode.CTRL_RIGHT))
        if (modifierKeyPressed) {
          WorkspaceStoreWrapper.getWorkspaceState().setIsHoldingModifier(false)
        }
        break
      }
    }
  }

  public notifyPixiOfKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case KeyCode.ALT_LEFT:
        if (!this.currentPointerEventHandler) {
          this.setHandMode(true)
        }
        break
    }
  }

  public notifyPixiOfKeyKeyUp(event: KeyboardEvent): void {
    switch (event.key) {
      case KeyCode.ALT_LEFT:
        this.setHandMode(false)
        break
    }
  }

  private setHandMode(on: boolean): void {
    if (on) {
      WorkspaceStoreWrapper.getWorkspaceState().setIsHoldingOptAlt(true)
    } else {
      WorkspaceStoreWrapper.getWorkspaceState().setIsHoldingOptAlt(false)
    }
  }

  public update(): void {
    workspaceMirror.setScale(this.scale.x, this.lastViewportScrolledPosition)
    if (Vector.sub(this.previousCamera, this.camera).mag() > 0.1) {
      workspaceMirror.updateUiPosition(
        Vector.mul(Vector.sub(this.previousCamera, this.camera), this.scale.x),
      )
      this.scrollBackgroundSprite(
        this.camera.x - this.previousCamera.x,
        this.camera.y - this.previousCamera.y,
      )
      this.scrollTile()
      this.previousCamera = this.camera.copy()
    }
    this.manager.render()
  }

  public getViewportRect(): Rectangle {
    return new Rectangle(
      this.camera.x - this.manager.width / this.scale.x / 2,
      this.camera.y - this.manager.height / this.scale.y / 2,
      this.camera.x + this.manager.width / this.scale.x / 2,
      this.camera.y + this.manager.height / this.scale.y / 2,
    )
  }

  public getMostRecentMousePosition(): Vector {
    const canvasOffset = this.manager.canvasOffset()
    return Vector.sub(this.previousMousePosition, canvasOffset)
  }

  public resize(screenWidth: number, screenHeight: number): void {
    // This is used to reposition the camera and the world.
    const deltaVector = new Vector(
      (screenWidth - this.currentScreenWidth) / 2,
      (screenHeight - this.currentScreenHeight) / 2,
    )

    this.currentScreenWidth = screenWidth
    this.currentScreenHeight = screenHeight

    // Changes coordinates of world.
    this.x += deltaVector.x
    this.y += deltaVector.y

    this.camera.add(deltaVector)
    this.pivot.set(this.camera.x, this.camera.y)
    // Prevents unnecessary updates.
    this.previousCamera = this.camera.copy()

    if (this.backgroundSprite) {
      const previousBackgroundWidth = this.backgroundSprite.width
      const previousBackgroundHeight = this.backgroundSprite.height
      this.updateBackgroundSpriteAfterScroll(
        previousBackgroundWidth,
        previousBackgroundHeight,
      )
    }

    const spatialSortMiddleware = middlewareManager.getMiddleware(
      MiddlewareType.SPATIAL_SORT,
    ) as SpatialSortMiddleware

    spatialSortMiddleware.refreshDependencyArrows()
  }

  public forwardKeyDownToPixi(event: KeyboardEvent): void {
    this.onKeyDown(event)
  }

  public forwardKeyUpToPixi(event: KeyboardEvent): void {
    this.onKeyUp(event)
  }

  public onChangeSceneTo(): void {
    this.canvasListeners = []
    this.canvasListeners.push({
      identifier: "keydown",
      listener: this.onKeyDown.bind(this),
    })
    this.canvasListeners.push({
      identifier: "keyup",
      listener: this.onKeyUp.bind(this),
    })
    this.canvasListeners.push({
      identifier: "pointerdown",
      listener: this.onPointerDown.bind(this),
    })
    this.canvasListeners.push({
      identifier: "pointerup",
      listener: this.onPointerUp.bind(this),
    })
    this.canvasListeners.push({
      identifier: "pointermove",
      listener: this.onPointerMove.bind(this),
    })
    this.canvasListeners.push({
      identifier: "wheel",
      listener: this.onWheel.bind(this),
      options: { passive: false },
    })
    for (const { identifier, listener, options } of this.canvasListeners) {
      this.manager.canvas.addEventListener(
        identifier,
        listener as EventListener,
        options,
      )
    }

    this.documentListeners = []
    this.documentListeners.push({
      identifier: "pointerdown",
      listener: this.onDocumentPointerDown.bind(this),
      options: { capture: true },
    })
    this.documentListeners.push({
      identifier: "pointerup",
      listener: this.onDocumentPointerUp.bind(this),
      options: { capture: true },
    })
    this.documentListeners.push({
      identifier: "pointermove",
      listener: this.onDocumentPointerMove.bind(this),
    })
    this.documentListeners.push({
      identifier: "contextmenu",
      listener: this.onContextMenu.bind(this),
    })
    this.documentListeners.push({
      identifier: "keydown",
      listener: this.onDocumentKeyDown.bind(this),
    })
    this.documentListeners.push({
      identifier: "keyup",
      listener: this.onDocumentKeyUp.bind(this),
    })
    for (const { identifier, listener, options } of this.documentListeners) {
      document.addEventListener(identifier, listener as EventListener, options)
    }
  }

  public onChangeSceneFrom(): void {
    for (const { identifier, listener } of this.canvasListeners) {
      this.manager.canvas.removeEventListener(
        identifier,
        listener as EventListener,
      )
    }
    this.canvasListeners = []
  }

  private updateBackgroundSpriteAfterScroll(
    previousBackgroundWidth: number,
    previousBackgroundHeight: number,
    scaleAdjX?: number,
    scaleAdjY?: number,
    deltaX?: number,
    deltaY?: number,
  ) {
    this.backgroundSprite.position.set(
      this.camera.x - this.manager.width / 2 / this.scale.x,
      this.camera.y - this.manager.height / 2 / this.scale.y,
    )

    this.backgroundSprite.width = this.manager.width / this.scale.x
    this.backgroundSprite.height = this.manager.height / this.scale.y

    this.tilePosition = new Vector(
      this.backgroundSprite.tilePosition.x +
        (this.backgroundSprite.width - previousBackgroundWidth) *
          (scaleAdjX ?? 0.5) -
        (deltaX ?? 0),
      this.backgroundSprite.tilePosition.y +
        (this.backgroundSprite.height - previousBackgroundHeight) *
          (scaleAdjY ?? 0.5) -
        (deltaY ?? 0),
    )

    this.backgroundSprite.tilePosition.set(
      this.tilePosition.x,
      this.tilePosition.y,
    )
  }

  private scrollBackgroundSprite(deltaX: number, deltaY: number) {
    this.backgroundSprite.position.set(
      this.camera.x - this.manager.width / 2 / this.scale.x,
      this.camera.y - this.manager.height / 2 / this.scale.y,
    )

    this.tilePosition.sub(new Vector(deltaX, deltaY))
  }

  private scrollTile() {
    this.backgroundSprite.tilePosition.set(
      this.tilePosition.x,
      this.tilePosition.y,
    )
  }

  public navigateToPosition(
    canvasPosition: Vector,
    size: Vector,
    navigationType: NavigationType,
  ) {
    const bounds = Rectangle.fromPositionAndSize(
      canvasPosition,
      Vector.div(size, this.scale.x),
    )

    // If the bounds supplied are entirely contained within the viewport, do nothing.
    if (this.getViewportRect().containsBounds(bounds)) {
      return
    }

    this.navigateToPositionUnconditionally(canvasPosition, size, navigationType)
  }

  public setDependencyArrows(dependencyArrows: DependencyArrow[]) {
    this.dirtyRender()

    for (const dependencyArrowGraphic of this.dependencyArrows) {
      this.removeChild(dependencyArrowGraphic)
      dependencyArrowGraphic.destroy()
    }
    this.dependencyArrows = []
    for (const dependencyArrow of dependencyArrows) {
      const dependencyArrowGraphic = new Graphics()
      this.dependencyArrows.push(dependencyArrowGraphic)
      this.addChild(dependencyArrowGraphic)
      const delta = Vector.sub(dependencyArrow.to, dependencyArrow.from)
      // const curve =
      //     delta.x > delta.y
      //         ? delta.x > 0
      //             ? new Vector(0, delta.y)
      //             : new Vector(0, -delta.y)
      //         : delta.y > 0
      //         ? new Vector(-delta.x, 0)
      //         : new Vector(delta.x, 0)
      // const quadraticControlPoint = Vector.add(
      //     Vector.div(delta, 2),
      //     curve
      // )

      // The beginning of the arrow i.e. the "from" position.
      if (!dependencyArrow.symmetrical) {
        dependencyArrowGraphic.beginFill(dependencyArrow.color)
        dependencyArrowGraphic.drawCircle(
          dependencyArrow.from.x,
          dependencyArrow.from.y,
          10,
        )
        dependencyArrowGraphic.endFill()
      }

      dependencyArrowGraphic.moveTo(
        dependencyArrow.from.x,
        dependencyArrow.from.y,
      )
      // dependencyArrowGraphic.quadraticCurveTo(
      //     quadraticControlPoint.x,
      //     quadraticControlPoint.y,
      //     dependencyArrow.to.x,
      //     dependencyArrow.to.y
      // )
      if (
        dependencyArrow.dependencyArrowType === DependencyArrowType.SAME_FILE
      ) {
        this.createDashedLineTo(
          dependencyArrowGraphic,
          new Vector(dependencyArrow.from.x, dependencyArrow.from.y),
          new Vector(dependencyArrow.to.x, dependencyArrow.to.y),
        )
      } else {
        dependencyArrowGraphic.lineTo(
          dependencyArrow.to.x,
          dependencyArrow.to.y,
        )
      }

      // Compute necessary information for arrow wings.
      // const arrowHeadDelta = Vector.sub(
      //     dependencyArrow.to,
      //     quadraticControlPoint
      // )
      const normalizedArrowHeadDelta = Vector.normalize(delta)
      const arrowLength = 10 // Length of the arrow
      const arrowWingsLength = 10 // How far arrow wings are from the main line (orthogonally).
      // Computes the orthogonal vector to the normalized delta.
      const topX = -normalizedArrowHeadDelta.y
      const topY = normalizedArrowHeadDelta.x

      if (
        dependencyArrow.dependencyArrowType ===
        DependencyArrowType.SYMBOL_DEPENDENCY
      ) {
        if (dependencyArrow.symmetrical) {
          this.createArrowWings(
            dependencyArrowGraphic,
            dependencyArrow,
            normalizedArrowHeadDelta,
            topX,
            topY,
            arrowLength,
            arrowWingsLength,
            false,
          )
          this.createArrowWings(
            dependencyArrowGraphic,
            dependencyArrow,
            Vector.mul(normalizedArrowHeadDelta, -1),
            -topX,
            -topY,
            arrowLength,
            arrowWingsLength,
            true,
          )
        } else {
          this.createArrowWings(
            dependencyArrowGraphic,
            dependencyArrow,
            normalizedArrowHeadDelta,
            topX,
            topY,
            arrowLength,
            arrowWingsLength,
            false,
          )
        }
      }

      dependencyArrowGraphic.stroke({ width: 3, color: dependencyArrow.color })
    }
  }

  private createArrowWings(
    dependencyArrowGraphic: Graphics,
    dependencyArrow: DependencyArrow,
    normalizedDelta: Vector,
    topX: number,
    topY: number,
    arrowLength: number,
    arrowWingsLength: number,
    reversed: boolean,
  ) {
    // This is where arrow should end.
    const endVector = reversed ? dependencyArrow.from : dependencyArrow.to

    // Offset from which the wings should span.
    const wingVector = Vector.add(
      reversed ? dependencyArrow.from : dependencyArrow.to,
      Vector.mul(normalizedDelta, -arrowLength),
    )

    // Draw the arrows.
    dependencyArrowGraphic.moveTo(endVector.x, endVector.y)
    dependencyArrowGraphic.lineTo(
      wingVector.x + topX * arrowWingsLength,
      wingVector.y + topY * arrowWingsLength,
    )
    dependencyArrowGraphic.moveTo(endVector.x, endVector.y)
    dependencyArrowGraphic.lineTo(
      wingVector.x - topX * arrowWingsLength,
      wingVector.y - topY * arrowWingsLength,
    )
  }

  public cameraPosition(): Vector {
    return this.camera.copy()
  }

  public canvasPosition(): Vector {
    return this.getViewportRect().topLeft()
  }

  public getResizeBehavior(): ResizeHandler {
    return this.resizeHandler
  }

  public getMoveBehavior(): MoveHandler {
    return this.moveHandler
  }

  public setCameraPosition(position: Vector): void {
    this.camera = position.copy()
    this.pivot.set(this.camera.x, this.camera.y)
    this.dirtyRender()
  }

  public isHandlingPointerEvent(): boolean {
    return !!this.currentPointerEventHandler
  }

  public receiveForwardedPointerEvent(
    event: PointerEvent,
    force: boolean = false,
  ): void {
    if (!force && !this.currentPointerEventHandler) return
    if (
      this.currentPointerEventHandler?.handlerType ===
      PointerEventHandlerType.CANVAS
    ) {
      switch (event.type) {
        case "pointermove":
          this.onPointerMove(event)
          break
        case "pointerdown":
          this.onPointerDown(event)
          break
        case "pointerup":
          this.onPointerUp(event)
          break
      }
    } else {
      switch (event.type) {
        case "pointermove":
          this.onDocumentPointerMove(event)
          break
        case "pointerdown":
          this.onDocumentPointerDown(event)
          break
        case "pointerup":
          this.onDocumentPointerUp(event)
          break
        case "contextmenu":
          this.onContextMenu(event)
          break
      }
    }
  }

  public navigateToPositionUnconditionally(
    canvasPosition: Vector,
    size: Vector,
    navigationType: NavigationType,
  ): void {
    const numSteps = 20

    let delta: Vector
    const viewportRect = this.getViewportRect()

    switch (navigationType) {
      case NavigationType.JUST_ENOUGH:
        let deltaX = 0
        let deltaY = 0

        if (canvasPosition.x < viewportRect.left) {
          // Pan to the left just enough.
          deltaX = canvasPosition.x - viewportRect.left - VIEWPORT_PADDING * 2
        } else if (canvasPosition.x + size.x > viewportRect.right) {
          // Pan to the right just enough. Note that we accommodate
          // the dependency buttons here.
          deltaX =
            canvasPosition.x +
            size.x -
            viewportRect.right +
            VIEWPORT_PADDING * 2
        }

        if (canvasPosition.y < viewportRect.top) {
          // Pan to the top just enough.
          deltaY = canvasPosition.y - viewportRect.top - VIEWPORT_PADDING * 2
        } else if (canvasPosition.y + size.y > viewportRect.bottom) {
          // Pan to the bottom just enough.
          deltaY =
            canvasPosition.y +
            size.y -
            viewportRect.bottom +
            VIEWPORT_PADDING * 2
        }

        delta = new Vector(deltaX, deltaY)
        break
      case NavigationType.CENTER:
        delta = Vector.sub(
          Vector.add(canvasPosition, Vector.div(size, 2)),
          this.camera,
        )
        break
    }

    const distDeltaX = delta.x / numSteps
    const distDeltaY = delta.y / numSteps

    // If the viewport is too small to encompass the editor, we'll increase the scale as well.
    const [width, height] = [viewportRect.width(), viewportRect.height()]

    let scaleDelta = 0

    if (size.x > width) {
      scaleDelta = width / size.x - this.scale.x
    } else if (size.y > height) {
      scaleDelta = height / size.y - this.scale.x
    }
    scaleDelta /= numSteps

    let previousBackgroundWidth = this.backgroundSprite.width
    let previousBackgroundHeight = this.backgroundSprite.height

    for (const timeout of this.navigationTimeouts) {
      clearTimeout(timeout)
    }

    this.navigationTimeouts = []

    for (let i = 0; i < numSteps; i++) {
      this.navigationTimeouts.push(
        setTimeout(
          () => {
            this.camera.x += distDeltaX
            this.camera.y += distDeltaY

            // We are on the ultimate step. Set the dependency arrows
            // to their correct position if necessary.
            if (i === numSteps - 1) {
              this.update()

              const spatialSortMiddleware = middlewareManager.getMiddleware(
                MiddlewareType.SPATIAL_SORT,
              ) as SpatialSortMiddleware

              spatialSortMiddleware.refreshDependencyArrows()
            }

            this.scale.set((this.scale.x += scaleDelta))
            this.pivot.set(this.camera.x, this.camera.y)

            if (scaleDelta !== 0) {
              this.updateBackgroundSpriteAfterScroll(
                previousBackgroundWidth,
                previousBackgroundHeight,
                scaleDelta,
                scaleDelta,
              )
            }
            previousBackgroundWidth = this.backgroundSprite.width
            previousBackgroundHeight = this.backgroundSprite.height
            this.dirtyRender()
          },
          i * (250 / numSteps),
        ),
      )
    }
  }

  public setCanvasScale(
    scale: number,
    mousePosition?: Vector | undefined,
  ): void {
    if (mousePosition == null) {
      this.scale.set(scale)
      this.lastViewportScrolledPosition =
        this.manager.getCenterOfCanvasViewport()
    } else {
      const tempPivotVector = new Vector(this.pivot.x, this.pivot.y)
      // We set the pivot temporarily so we can scale at the position of the mouse.
      this.pivot.set(mousePosition.x, mousePosition.y)
      const newScale = clamp(scale, MIN_CANVAS_SCALE, MAX_CANVAS_SCALE)
      this.scale.x = newScale
      this.scale.y = newScale
      this.pivot.set(tempPivotVector.x, tempPivotVector.y)
      this.lastViewportScrolledPosition = mousePosition
    }
    this.dirtyRender()
  }

  public getCloseHeaderBehavior(): CloseHeaderHandler {
    return this.closeHeaderHandler
  }

  public removeCanvasDots(): void {
    this.removeChild(this.backgroundSprite)
    this.update()
  }

  public addCanvasDots(): void {
    this.addChildAt(this.backgroundSprite, 0)
    this.update()
  }

  private createDashedLineTo(
    graphics: Graphics,
    from: Vector,
    to: Vector,
    dash = 10,
    gap = 5,
  ) {
    const distance = to.distanceFrom(from)
    const v = Vector.new()
    for (let i = dash + gap; i <= distance; i += dash + gap) {
      v.lerpVectors(from, to, (i - gap) / distance)
      graphics.lineTo(v.x, v.y)
      v.lerpVectors(from, to, i / distance)
      graphics.moveTo(v.x, v.y)
    }
    graphics.lineTo(to.x, to.y)
  }
}

function convertKeyCodeToNumber(keyCode: KeyCode): number | null {
  switch (keyCode) {
    case KeyCode.ONE:
      return 1
    case KeyCode.TWO:
      return 2
    case KeyCode.THREE:
      return 3
    case KeyCode.FOUR:
      return 4
    case KeyCode.FIVE:
      return 5
    case KeyCode.SIX:
      return 6
    case KeyCode.SEVEN:
      return 7
    case KeyCode.EIGHT:
      return 8
    case KeyCode.NINE:
      return 9
    default:
      return null
  }
}
