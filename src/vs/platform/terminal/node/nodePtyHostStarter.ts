/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, DisposableStore } from "vs/base/common/lifecycle"
import { FileAccess, Schemas } from "vs/base/common/network"
import { Client, IIPCOptions } from "vs/base/parts/ipc/node/ipc.cp"
import {
  IEnvironmentService,
  INativeEnvironmentService,
} from "vs/platform/environment/common/environment"
import { parsePtyHostDebugPort } from "vs/platform/environment/node/environmentService"
import { IReconnectConstants } from "vs/platform/terminal/common/terminal"
import {
  IPtyHostConnection,
  IPtyHostStarter,
} from "vs/platform/terminal/node/ptyHost"

export class NodePtyHostStarter extends Disposable implements IPtyHostStarter {
  constructor(
    private readonly _reconnectConstants: IReconnectConstants,
    @IEnvironmentService
    private readonly _environmentService: INativeEnvironmentService,
  ) {
    super()
  }

  start(): IPtyHostConnection {
    const opts: IIPCOptions = {
      serverName: "Pty Host",
      args: [
        "--type=ptyHost",
        "--logsPath",
        this._environmentService.logsHome.with({ scheme: Schemas.file }).fsPath,
      ],
      env: {
        HAYSTACK_AMD_ENTRYPOINT: "vs/platform/terminal/node/ptyHostMain",
        HAYSTACK_PIPE_LOGGING: "true",
        HAYSTACK_VERBOSE_LOGGING: "true", // transmit console logs from server to client,
        HAYSTACK_RECONNECT_GRACE_TIME: this._reconnectConstants.graceTime,
        HAYSTACK_RECONNECT_SHORT_GRACE_TIME:
          this._reconnectConstants.shortGraceTime,
        HAYSTACK_RECONNECT_SCROLLBACK: this._reconnectConstants.scrollback,
      },
    }

    const ptyHostDebug = parsePtyHostDebugPort(
      this._environmentService.args,
      this._environmentService.isBuilt,
    )
    if (ptyHostDebug) {
      if (ptyHostDebug.break && ptyHostDebug.port) {
        opts.debugBrk = ptyHostDebug.port
      } else if (!ptyHostDebug.break && ptyHostDebug.port) {
        opts.debug = ptyHostDebug.port
      }
    }

    const client = new Client(
      FileAccess.asFileUri("bootstrap-fork").fsPath,
      opts,
    )

    const store = new DisposableStore()
    store.add(client)

    return {
      client,
      store,
      onDidProcessExit: client.onDidProcessExit,
    }
  }
}
