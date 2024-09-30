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

"use strict"

const withDefaults = require("../shared.webpack.config")

module.exports = withDefaults({
  context: __dirname,
  entry: {
    extension: "./src/configurationEditingMain.ts",
  },
  output: {
    filename: "configurationEditingMain.js",
  },
  resolve: {
    mainFields: ["module", "main"],
  },
})
