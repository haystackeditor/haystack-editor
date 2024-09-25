/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export class SyncDescriptor<T> {
  readonly ctor: any
  readonly staticArguments: any[]
  readonly supportsDelayedInstantiation: boolean

  constructor(
    ctor: new (...args: any[]) => T,
    staticArguments: any[] = [],
    supportsDelayedInstantiation: boolean = false,
  ) {
    this.ctor = ctor
    this.staticArguments = staticArguments
    this.supportsDelayedInstantiation = supportsDelayedInstantiation
  }
}

export interface SyncDescriptor0<T> {
  readonly ctor: new () => T
}
