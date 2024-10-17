/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ISpliceable } from 'vs/base/common/sequence';

export interface ISpreadSpliceable<T> {
	splice(start: number, deleteCount: number, ...elements: T[]): void;
}

export class CombinedSpliceable<T> implements ISpliceable<T> {

	constructor(private spliceables: ISpliceable<T>[]) { }

	splice(start: number, deleteCount: number, elements: T[]): void {
		this.spliceables.forEach(s => s.splice(start, deleteCount, elements));
	}
}