/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { Application, Container } from "pixi.js"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { ResizeHandler } from "./pointer_event_handlers/resize_handler"
import { MoveHandler } from "./pointer_event_handlers/move_handler"
import { Rectangle } from "vs/workbench/browser/haystack-frontend/canvas/rectangle"
import { DeferredPromise } from "vs/base/common/async"
import { CloseHeaderHandler } from "vs/workbench/browser/haystack-frontend/canvas/pointer_event_handlers/close_header_handler"
import { NavigationType } from "vs/workbench/browser/haystack-frontend/workspace/editors/common"
import { DependencyArrow } from "vs/workbench/services/haystack/common/haystackService"

// This is padding for UI elements from any edge of the viewport.
export const VIEWPORT_PADDING = 25

export class RendererManager {
  private static rendererManager: RendererManagerInterface
  public static rendererManagerIsInitialized: DeferredPromise<void> =
    new DeferredPromise()

  public static async setInstance(rendererManager: RendererManagerInterface) {
    this.rendererManager = rendererManager
  }

  public static getInstance(): RendererManagerInterface {
    return this.rendererManager
  }
}

export interface RendererManagerInterface {
  app: Application

  canvas: HTMLCanvasElement

  get width(): number

  get height(): number

  initialize(background: number): Promise<void>

  changeColor(color: number): void

  resize(): void

  // Workspace APIs
  switchToWorkspace(): void

  forwardPointerEvent(event: PointerEvent, force: boolean): void

  navigateToPosition(
    canvasPosition: Vector,
    size: Vector,
    navigationType: NavigationType
  ): void

  navigateToPositionUnconditionally(
    canvasPosition: Vector,
    size: Vector,
    navigationType: NavigationType
  ): void

  setDependencyArrows(dependencyArrows: DependencyArrow[]): void

  getCameraPosition(): Vector

  setCameraPosition(position: Vector): void

  isScrolling(): boolean

  handleWheelEvent(e: WheelEvent): void

  getCenterOfCanvasViewport(): Vector

  getUpperLeftQuadrantViewport(): Vector

  canvasOffset(): Vector

  canvasPosition(): Vector

  // This is meant to notify the Pixi code to react to certain keyboard events when the focus is not on the canvas.
  // Implementors of this code should be very cautious when causing side-effects such as preventDefault or
  // stopPropagation as they may interrupt user flow in certain UI.
  notifyPixiOfKeyboardInput(event: KeyboardEvent): void

  forwardKeyboardInputToPixi(event: KeyboardEvent): void

  getCanvasElement(): HTMLCanvasElement

  getResizeBehavior(): ResizeHandler

  getMoveBehavior(): MoveHandler

  isHandlingMouseEvent(): boolean

  startQuitTimeout(): void

  clearQuitTimeout(): void

  getViewportDimensionsWithPadding(): Vector

  getViewportRect(): Rectangle

  getViewportDimensionsWithDoublePadding(): Vector

  getViewportDimensions(): Vector

  setCanvasScale(scale: number, mousePosition?: Vector): void

  getMostRecentMousePosition(): Vector

  getCloseHeaderBehavior(): CloseHeaderHandler

  removeCanvasDots(): void

  addCanvasDots(): void

  render(): void
}

export interface IScene extends Container {
  update(): void

  cameraPosition(): Vector
  canvasPosition(): Vector
  getViewportRect(): Rectangle
  setCanvasScale(scale: number, mousePosition?: Vector): void

  getMostRecentMousePosition(): Vector

  setCameraPosition(delta: Vector): void
  resize(screenWidth: number, screenHeight: number): void

  getResizeBehavior(): ResizeHandler
  getMoveBehavior(): MoveHandler
  getCloseHeaderBehavior(): CloseHeaderHandler

  isHandlingPointerEvent(): boolean

  handleWheelEvent(e: WheelEvent): void
  notifyPixiOfKeyDown(event: KeyboardEvent): void
  notifyPixiOfKeyKeyUp(event: KeyboardEvent): void
  forwardKeyDownToPixi(event: KeyboardEvent): void
  forwardKeyUpToPixi(event: KeyboardEvent): void
  isScrolling(): boolean

  onChangeSceneFrom(): void
  onChangeSceneTo(): void
}
