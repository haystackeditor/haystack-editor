/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { DeferredPromise, timeout } from "vs/base/common/async"
import { CancellationTokenSource } from "vs/base/common/cancellation"
import { Position } from "vs/editor/common/core/position"
import { ITextModel } from "vs/editor/common/model"
import { CallHierarchyModel } from "vs/workbench/contrib/callHierarchy/common/callHierarchy"

export class CallHierarchyProvider {
  private model: CallHierarchyModel | undefined = undefined
  private hasGrabbedModelPromise = new DeferredPromise<void>()

  constructor(model: ITextModel, position: Position) {
    const cts = new CancellationTokenSource()
    CallHierarchyModel.create(model, position, cts.token).then((model) => {
      this.model = model
      this.hasGrabbedModelPromise.complete()
    })
  }

  public async getIncomingCalls() {
    await Promise.race([this.hasGrabbedModelPromise.p, timeout(20000)])
    const cts = new CancellationTokenSource()
    return this.model?.resolveIncomingCalls(this.model.root, cts.token)
  }

  public async getOutgoingCalls() {
    await Promise.race([this.hasGrabbedModelPromise.p, timeout(20000)])
    const cts = new CancellationTokenSource()
    return this.model?.resolveOutgoingCalls(this.model.root, cts.token)
  }
}
