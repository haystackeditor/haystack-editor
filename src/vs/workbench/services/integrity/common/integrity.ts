/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/base/common/uri';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export const IIntegrityService = createDecorator<IIntegrityService>('integrityService');

export interface ChecksumPair {
	uri: URI;
	actual: string;
	expected: string;
	isPure: boolean;
}

export interface IntegrityTestResult {
	isPure: boolean;
	proof: ChecksumPair[];
}

export interface IIntegrityService {
	readonly _serviceBrand: undefined;

	isPure(): Promise<IntegrityTestResult>;
}
