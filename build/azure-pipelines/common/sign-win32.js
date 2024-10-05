"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const sign_1 = require("./sign");
const path = require("path");
(0, sign_1.main)([
    process.env["EsrpCliDllPath"],
    "sign-windows",
    process.env["ESRPPKI"],
    process.env["ESRPAADUsername"],
    process.env["ESRPAADPassword"],
    path.dirname(process.argv[2]),
    path.basename(process.argv[2]),
]);
//# sourceMappingURL=sign-win32.js.map