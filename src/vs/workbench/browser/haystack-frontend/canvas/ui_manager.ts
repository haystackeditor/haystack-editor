/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { Application, Container } from "pixi.js"

export class UiManager {
  public app!: Application
  private canvas!: HTMLCanvasElement
  private resizer!: HTMLDivElement
  private scene!: Container
  private numUiElements = 0

  private constructor() {}

  public get width(): number {
    return Math.max(this.resizer.clientWidth || 0)
  }

  public get height(): number {
    return Math.max(this.resizer.clientHeight || 0)
  }

  private static manager: UiManager | null

  public static getInstance(): UiManager {
    if (this.manager == null) {
      this.manager = new UiManager()
    }
    return this.manager
  }

  public static getUiStage(): Container {
    if (this.manager == null) {
      this.manager = new UiManager()
    }
    return this.manager.scene
  }

  public async initialize(): Promise<void> {
    this.canvas = document.getElementById("ui-canvas") as HTMLCanvasElement
    this.resizer = document.getElementById("pixi-resizer") as HTMLDivElement

    this.app = new Application()

    // @ts-nocheck
    await this.app.init({
      canvas: this.canvas,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: false,
      backgroundAlpha: 0,
    })

    this.app.ticker.autoStart = false
    this.app.ticker.stop()

    const resizeObserver = new ResizeObserver(() => {
      this.resize()
    })

    resizeObserver.observe(this.resizer)
    this.scene = new Container()
    this.app.stage.addChild(this.scene)

    this.renderLoop()
  }

  public resize(): void {
    this.app.renderer.resize(this.width, this.height)
  }

  private renderLoop(): void {
    // Only render if we need to draw UI.
    if (this.scene.children.length > 0) {
      this.app.renderer.render(this.scene)
      this.numUiElements = this.scene.children.length
    } else if (this.numUiElements > 0) {
      // Render an empty canvas.
      this.app.renderer.render(this.scene)
      this.numUiElements = 0
    }

    requestAnimationFrame(() => this.renderLoop())
  }
}
