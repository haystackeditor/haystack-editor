/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { context, ipcRenderer, process, webFrame } from 'vs/base/parts/sandbox/electron-sandbox/globals';
import { ensureNoDisposablesAreLeakedInTestSuite } from 'vs/base/test/common/utils';

suite('Sandbox', () => {

	test('globals', async () => {
		assert.ok(typeof ipcRenderer.send === 'function');
		assert.ok(typeof webFrame.setZoomLevel === 'function');
		assert.ok(typeof process.platform === 'string');

		const config = await context.resolveConfiguration();
		assert.ok(config);
		assert.ok(context.configuration());
	});

	ensureNoDisposablesAreLeakedInTestSuite();
});
