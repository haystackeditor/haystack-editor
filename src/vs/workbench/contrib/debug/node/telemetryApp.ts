/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Server } from 'vs/base/parts/ipc/node/ipc.cp';
import { TelemetryAppenderChannel } from 'vs/platform/telemetry/common/telemetryIpc';
import { OneDataSystemAppender } from 'vs/platform/telemetry/node/1dsAppender';

const appender = new OneDataSystemAppender(undefined, false, process.argv[2], JSON.parse(process.argv[3]), process.argv[4]);
process.once('exit', () => appender.flush());

const channel = new TelemetryAppenderChannel([appender]);
const server = new Server('telemetry');
server.registerChannel('telemetryAppender', channel);
