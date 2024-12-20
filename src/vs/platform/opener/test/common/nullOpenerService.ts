/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from 'vs/base/common/lifecycle';
import { URI } from 'vs/base/common/uri';
import { IOpenerService } from '../../common/opener';

export const NullOpenerService = Object.freeze<IOpenerService>({
	_serviceBrand: undefined,
	registerOpener() { return Disposable.None; },
	registerValidator() { return Disposable.None; },
	registerExternalUriResolver() { return Disposable.None; },
	setDefaultExternalOpener() { },
	registerExternalOpener() { return Disposable.None; },
	async open() { return false; },
	async resolveExternalUri(uri: URI) { return { resolved: uri, dispose() { } }; },
});
