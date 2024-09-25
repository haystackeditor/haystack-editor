/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
  IUserDataSyncResourceProviderService,
  IUserDataSyncService,
  IUserDataSyncStoreManagementService,
} from "vs/platform/userDataSync/common/userDataSync"
import { registerSharedProcessRemoteService } from "vs/platform/ipc/electron-sandbox/services"
import { UserDataSyncServiceChannelClient } from "vs/platform/userDataSync/common/userDataSyncServiceIpc"
import { IUserDataSyncMachinesService } from "vs/platform/userDataSync/common/userDataSyncMachines"
import {
  UserDataSyncAccountServiceChannelClient,
  UserDataSyncStoreManagementServiceChannelClient,
} from "vs/platform/userDataSync/common/userDataSyncIpc"
import { IUserDataSyncAccountService } from "vs/platform/userDataSync/common/userDataSyncAccount"

registerSharedProcessRemoteService(IUserDataSyncService, "userDataSync", {
  channelClientCtor: UserDataSyncServiceChannelClient,
})
registerSharedProcessRemoteService(
  IUserDataSyncResourceProviderService,
  "IUserDataSyncResourceProviderService",
)
registerSharedProcessRemoteService(
  IUserDataSyncMachinesService,
  "userDataSyncMachines",
)
registerSharedProcessRemoteService(
  IUserDataSyncAccountService,
  "userDataSyncAccount",
  { channelClientCtor: UserDataSyncAccountServiceChannelClient },
)
registerSharedProcessRemoteService(
  IUserDataSyncStoreManagementService,
  "userDataSyncStoreManagement",
  { channelClientCtor: UserDataSyncStoreManagementServiceChannelClient },
)
