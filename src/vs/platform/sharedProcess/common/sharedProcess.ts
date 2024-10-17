/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const SharedProcessLifecycle = {
	exit: 'vscode:electron-main->shared-process=exit',
	ipcReady: 'vscode:shared-process->electron-main=ipc-ready',
	initDone: 'vscode:shared-process->electron-main=init-done'
};

export const SharedProcessChannelConnection = {
	request: 'vscode:createSharedProcessChannelConnection',
	response: 'vscode:createSharedProcessChannelConnectionResult'
};

export const SharedProcessRawConnection = {
	request: 'vscode:createSharedProcessRawConnection',
	response: 'vscode:createSharedProcessRawConnectionResult'
};
