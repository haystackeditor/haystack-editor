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

const withBrowserDefaults = require("../../shared.webpack.config").browser
const path = require("path")

module.exports = withBrowserDefaults({
  context: __dirname,
  entry: {
    extension: "./src/browser/jsonServerWorkerMain.ts",
  },
  output: {
    filename: "jsonServerMain.js",
    path: path.join(__dirname, "dist", "browser"),
    libraryTarget: "var",
    library: "serverExportVar",
  },
})
