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

export const IStateReadService = createDecorator<IStateReadService>('stateReadService');
export interface IStateReadService {

	readonly _serviceBrand: undefined;

	getItem<T>(key: string, defaultValue: T): T;
	getItem<T>(key: string, defaultValue?: T): T | undefined;

}

export const IStateService = createDecorator<IStateService>('stateService');
export interface IStateService extends IStateReadService {

	readonly _serviceBrand: undefined;

	setItem(key: string, data?: object | string | number | boolean | undefined | null): void;
	setItems(items: readonly { key: string; data?: object | string | number | boolean | undefined | null }[]): void;

	removeItem(key: string): void;

	close(): Promise<void>;
}
