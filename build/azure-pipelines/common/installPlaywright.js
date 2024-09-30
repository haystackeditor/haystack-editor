"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the Functional Source License. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
process.env.DEBUG = "pw:install"; // enable logging for this (https://github.com/microsoft/playwright/issues/17394)
const { installDefaultBrowsersForNpmInstall, } = require("playwright-core/lib/server");
async function install() {
    await installDefaultBrowsersForNpmInstall();
}
install();
//# sourceMappingURL=installPlaywright.js.map