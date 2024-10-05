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
const ts = require("typescript");
const workerpool = require("workerpool");
const staticLanguageServiceHost_1 = require("./staticLanguageServiceHost");
let service;
function findRenameLocations(projectPath, fileName, position) {
    if (!service) {
        service = ts.createLanguageService(new staticLanguageServiceHost_1.StaticLanguageServiceHost(projectPath));
    }
    return (service.findRenameLocations(fileName, position, false, false, {
        providePrefixAndSuffixTextForRename: true,
    }) ?? []);
}
workerpool.worker({
    findRenameLocations,
});
//# sourceMappingURL=renameWorker.js.map