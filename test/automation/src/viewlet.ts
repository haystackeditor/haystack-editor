/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Code } from './code';

export abstract class Viewlet {

	constructor(protected code: Code) { }

	async waitForTitle(fn: (title: string) => boolean): Promise<void> {
		await this.code.waitForTextContent('.monaco-workbench .part.sidebar > .title > .title-label > h2', undefined, fn);
	}
}
