/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IProcessEnvironment } from 'vs/base/common/platform';
import { process } from 'vs/base/parts/sandbox/electron-sandbox/globals';
import { InstantiationType, registerSingleton } from 'vs/platform/instantiation/common/extensions';

export const IShellEnvironmentService = createDecorator<IShellEnvironmentService>('shellEnvironmentService');

export interface IShellEnvironmentService {

	readonly _serviceBrand: undefined;

	getShellEnv(): Promise<IProcessEnvironment>;
}

export class ShellEnvironmentService implements IShellEnvironmentService {

	declare readonly _serviceBrand: undefined;

	getShellEnv(): Promise<IProcessEnvironment> {
		return process.shellEnv();
	}
}

registerSingleton(IShellEnvironmentService, ShellEnvironmentService, InstantiationType.Delayed);
