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
import { normalizeMimeType } from 'vs/base/common/mime';
import { ensureNoDisposablesAreLeakedInTestSuite } from 'vs/base/test/common/utils';

suite('Mime', () => {

	test('normalize', () => {
		assert.strictEqual(normalizeMimeType('invalid'), 'invalid');
		assert.strictEqual(normalizeMimeType('invalid', true), undefined);
		assert.strictEqual(normalizeMimeType('Text/plain'), 'text/plain');
		assert.strictEqual(normalizeMimeType('Text/pläin'), 'text/pläin');
		assert.strictEqual(normalizeMimeType('Text/plain;UPPER'), 'text/plain;UPPER');
		assert.strictEqual(normalizeMimeType('Text/plain;lower'), 'text/plain;lower');
	});

	ensureNoDisposablesAreLeakedInTestSuite();
});
