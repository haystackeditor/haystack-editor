/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { Application } from "pixi.js"
import {
  getGlobalState,
  ReactScene,
} from "vs/workbench/browser/haystack-frontend/global_state/global_store"
import { WorkspaceScene } from "vs/workbench/browser/haystack-frontend/canvas/workspace"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { ResizeHandler } from "./pointer_event_handlers/resize_handler"
import { MoveHandler } from "./pointer_event_handlers/move_handler"
import { Rectangle } from "vs/workbench/browser/haystack-frontend/canvas/rectangle"
import {
  IScene,
  RendererManager,
  RendererManagerInterface,
  VIEWPORT_PADDING,
} from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import { DependencyArrow } from "vs/workbench/services/haystack/common/haystackService"
import { NavigationType } from "vs/workbench/browser/haystack-frontend/workspace/editors/common"

type Timer = ReturnType<typeof setTimeout>

export class RendererManagerImpl implements RendererManagerInterface {
  public app!: Application
  private currentScene!: IScene
  public canvas!: HTMLCanvasElement
  private resizer: HTMLDivElement | null = null
  private quitTimeout: Timer | null = null

  private workspaceScene!: WorkspaceScene

  public constructor() {}

  public get width(): number {
    return Math.max(this.resizer?.clientWidth || 0)
  }

  public get height(): number {
    return Math.max(this.resizer?.clientHeight || 0)
  }

  public async initialize(background: number): Promise<void> {
    this.canvas = document.getElementById("pixi-canvas") as HTMLCanvasElement
    this.resizer = document.getElementById("pixi-resizer") as HTMLDivElement

    this.app = new Application()

    await this.app.init({
      canvas: this.canvas,
      resolution: window.devicePixelRatio || 1,
      backgroundColor: background,
    })

    this.app.ticker.autoStart = false
    this.app.ticker.stop()

    const resizeObserver = new ResizeObserver(() => {
      this.resize()
    })

    resizeObserver.observe(this.resizer)

    this.workspaceScene = new WorkspaceScene(this)

    getGlobalState().setScene(ReactScene.WORKSPACE)
    this.changeScene(this.workspaceScene)

    RendererManager.rendererManagerIsInitialized.complete()
  }

  public render() {
    this.app.renderer.render(this.currentScene)
  }

  public changeColor(color: number): void {
    this.app.renderer.background.color = color
    this.render()
  }

  public resize(): void {
    this.app.renderer.resize(this.width, this.height)
    this.workspaceScene.resize(this.width, this.height)
    this.app.renderer.render(this.currentScene)
  }

  // Workspace APIs
  public switchToWorkspace(): void {
    this.changeScene(this.workspaceScene)
    getGlobalState().setScene(ReactScene.WORKSPACE)
  }

  public forwardPointerEvent(
    event: PointerEvent,
    force: boolean = false,
  ): void {
    if (this.currentScene === this.workspaceScene) {
      this.workspaceScene.receiveForwardedPointerEvent(event, force)
    }
  }

  public navigateToPosition(
    canvasPosition: Vector,
    size: Vector,
    navigationType: NavigationType,
  ): void {
    if (this.currentScene === this.workspaceScene) {
      this.workspaceScene.navigateToPosition(
        canvasPosition,
        size,
        navigationType,
      )
    }
  }

  public setDependencyArrows(dependencyArrows: DependencyArrow[]) {
    if (this.currentScene === this.workspaceScene) {
      this.workspaceScene.setDependencyArrows(dependencyArrows)
    }
  }

  // Universal APIs
  private changeScene(newScene: IScene): void {
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene)
      this.currentScene.onChangeSceneFrom()
    }

    this.currentScene = newScene
    this.currentScene.onChangeSceneTo()
    this.app.stage.addChild(this.currentScene)
  }

  public getCameraPosition(): Vector {
    return this.currentScene.cameraPosition()
  }

  public setCameraPosition(position: Vector): void {
    this.currentScene.setCameraPosition(position)
  }

  public isScrolling() {
    return this.currentScene.isScrolling()
  }

  public handleWheelEvent(e: WheelEvent) {
    this.currentScene.handleWheelEvent(e)
  }

  public getCenterOfCanvasViewport(): Vector {
    return new Vector(this.width, this.height).div(2)
  }

  public getUpperLeftQuadrantViewport(): Vector {
    return new Vector(VIEWPORT_PADDING, VIEWPORT_PADDING * 2)
  }

  public canvasOffset(): Vector {
    if (this.resizer != null) {
      const boundingRect = this.resizer.getBoundingClientRect()
      return new Vector(boundingRect.left, boundingRect.top)
    }
    return Vector.new()
  }

  public canvasPosition(): Vector {
    return this.currentScene.canvasPosition()
  }

  // This is meant to notify the Pixi code to react to certain keyboard events when the focus is not on the canvas.
  // Implementors of this code should be very cautious when causing side-effects such as preventDefault or
  // stopPropagation as they may interrupt user flow in certain UI.
  public notifyPixiOfKeyboardInput(event: KeyboardEvent): void {
    switch (event.type) {
      case "keydown":
        this.currentScene.notifyPixiOfKeyDown(event)
        break
      case "keyup":
        this.currentScene.notifyPixiOfKeyKeyUp(event)
        break
    }
  }

  public forwardKeyboardInputToPixi(event: KeyboardEvent): void {
    switch (event.type) {
      case "keydown":
        this.currentScene.forwardKeyDownToPixi(event)
        break
      case "keyup":
        this.currentScene.forwardKeyUpToPixi(event)
        break
    }
  }

  public getCanvasElement(): HTMLCanvasElement {
    return this.canvas
  }

  public getResizeBehavior(): ResizeHandler {
    return this.currentScene.getResizeBehavior()
  }

  public getMoveBehavior(): MoveHandler {
    return this.currentScene.getMoveBehavior()
  }

  public isHandlingMouseEvent() {
    return this.currentScene.isHandlingPointerEvent()
  }

  public startQuitTimeout(): void {}

  public clearQuitTimeout(): void {
    if (this.quitTimeout === null) return
    clearTimeout(this.quitTimeout)
    this.quitTimeout = null
  }

  public getViewportDimensionsWithPadding(): Vector {
    return new Vector(
      this.width - VIEWPORT_PADDING,
      this.height - VIEWPORT_PADDING * 2,
    )
  }

  public getMostRecentMousePosition(): Vector {
    return this.currentScene.getMostRecentMousePosition()
  }

  // Private functions.

  public getViewportRect(): Rectangle {
    if (this.currentScene) {
      return this.currentScene.getViewportRect()
    }
    return new Rectangle(0, 0, 0, 0)
  }

  public getViewportDimensionsWithDoublePadding(): Vector {
    return new Vector(
      this.width - VIEWPORT_PADDING * 2,
      this.height - VIEWPORT_PADDING * 4,
    ).div(this.currentScene.scale.x)
  }

  public navigateToPositionUnconditionally(
    canvasPosition: Vector,
    size: Vector,
    navigationType: NavigationType,
  ): void {
    if (this.currentScene === this.workspaceScene) {
      this.workspaceScene.navigateToPositionUnconditionally(
        canvasPosition,
        size,
        navigationType,
      )
    }
  }

  public getViewportDimensions(): Vector {
    return new Vector(this.width, this.height)
  }

  public setCanvasScale(scale: number, mousePosition?: Vector): void {
    this.currentScene.setCanvasScale(scale, mousePosition)
    this.resize()
  }

  public getCloseHeaderBehavior(): any {
    return this.currentScene.getCloseHeaderBehavior()
  }

  public addCanvasDots(): void {
    this.workspaceScene.addCanvasDots()
  }

  public removeCanvasDots(): void {
    this.workspaceScene.removeCanvasDots()
  }
}
