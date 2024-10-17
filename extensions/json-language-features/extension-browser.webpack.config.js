/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

'use strict';

const withBrowserDefaults = require('../shared.webpack.config').browser;
const path = require('path');

module.exports = withBrowserDefaults({
	target: 'webworker',
	context: path.join(__dirname, 'client'),
	entry: {
		extension: './src/browser/jsonClientMain.ts'
	},
	output: {
		filename: 'jsonClientMain.js',
		path: path.join(__dirname, 'client', 'dist', 'browser')
	}
});
