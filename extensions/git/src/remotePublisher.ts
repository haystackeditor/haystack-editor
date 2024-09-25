/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, Event } from "vscode"
import { RemoteSourcePublisher } from "./api/git"

export interface IRemoteSourcePublisherRegistry {
  readonly onDidAddRemoteSourcePublisher: Event<RemoteSourcePublisher>
  readonly onDidRemoveRemoteSourcePublisher: Event<RemoteSourcePublisher>

  getRemoteSourcePublishers(): RemoteSourcePublisher[]
  registerRemoteSourcePublisher(publisher: RemoteSourcePublisher): Disposable
}
