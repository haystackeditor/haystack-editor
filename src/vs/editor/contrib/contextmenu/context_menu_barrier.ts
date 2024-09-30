import { DeferredPromise } from "vs/base/common/async"

export class ContextMenuBarrier {
  private barrier = new DeferredPromise<boolean>()

  private static contextMenuBarrier: ContextMenuBarrier | null = null

  constructor() {}

  public reset(): void {
    this.barrier = new DeferredPromise<boolean>()
  }

  public getPromise(): Promise<boolean> {
    return this.barrier.p
  }

  public complete(value: boolean): void {
    this.barrier.complete(value)
  }

  public static getInstance() {
    if (this.contextMenuBarrier == null) {
      this.contextMenuBarrier = new ContextMenuBarrier()
    }
    return this.contextMenuBarrier
  }
}
