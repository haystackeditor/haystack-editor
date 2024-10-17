/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from "vs/base/common/event"
import { Disposable, MutableDisposable } from "vs/base/common/lifecycle"
import {
  INotificationHandle,
  INotificationService,
  IPromptChoice,
  NotificationPriority,
  Severity,
} from "vs/platform/notification/common/notification"

export class EmailNotification extends Disposable {
  private _onDidClose = this._register(new Emitter<void>())
  readonly onDidClose = this._onDidClose.event

  private _onDidChangeVisibility = this._register(new Emitter<boolean>())
  readonly onDidChangeVisibility = this._onDidChangeVisibility.event

  private notificationHandle: INotificationHandle | undefined
  private cancelled: boolean = false

  constructor(
    private readonly severity: Severity,
    private readonly message: string,
    private readonly choices: IPromptChoice[],
    private readonly notificationService: INotificationService
  ) {
    super()
  }

  show(): void {
    if (!this.notificationHandle) {
      this.updateNotificationHandle(
        this.notificationService.prompt(
          this.severity,
          this.message,
          this.choices,
          { sticky: true, onCancel: () => (this.cancelled = true) }
        )
      )
    }
  }

  hide(): void {
    if (this.notificationHandle) {
      this.onDidCloseDisposable.clear()
      this.notificationHandle.close()
      this.cancelled = false
      this.updateNotificationHandle(
        this.notificationService.prompt(
          this.severity,
          this.message,
          this.choices,
          {
            priority: NotificationPriority.SILENT,
            onCancel: () => (this.cancelled = true),
          }
        )
      )
    }
  }

  isCancelled(): boolean {
    return this.cancelled
  }

  private readonly onDidCloseDisposable = this._register(
    new MutableDisposable()
  )
  private readonly onDidChangeVisibilityDisposable = this._register(
    new MutableDisposable()
  )
  private updateNotificationHandle(notificationHandle: INotificationHandle) {
    this.onDidCloseDisposable.clear()
    this.onDidChangeVisibilityDisposable.clear()
    this.notificationHandle = notificationHandle

    this.onDidCloseDisposable.value = this.notificationHandle.onDidClose(() => {
      this.onDidCloseDisposable.dispose()
      this.onDidChangeVisibilityDisposable.dispose()

      this._onDidClose.fire()

      this._onDidClose.dispose()
      this._onDidChangeVisibility.dispose()
    })
    this.onDidChangeVisibilityDisposable.value =
      this.notificationHandle.onDidChangeVisibility((e) =>
        this._onDidChangeVisibility.fire(e)
      )
  }
}
