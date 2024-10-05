"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePackageDeps = generatePackageDeps;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const dep_lists_1 = require("./dep-lists");
function generatePackageDeps(files) {
    const dependencies = files.map((file) => calculatePackageDeps(file));
    const additionalDepsSet = new Set(dep_lists_1.additionalDeps);
    dependencies.push(additionalDepsSet);
    return dependencies;
}
// Based on https://source.chromium.org/chromium/chromium/src/+/main:chrome/installer/linux/rpm/calculate_package_deps.py.
function calculatePackageDeps(binaryPath) {
    if (binaryPath.endsWith("haystack-tunnel") ||
        binaryPath.endsWith("haystack-server")) {
        return new Set();
    }
    try {
        if (!((0, fs_1.statSync)(binaryPath).mode & fs_1.constants.S_IXUSR)) {
            throw new Error(`Binary ${binaryPath} needs to have an executable bit set.`);
        }
    }
    catch (e) {
        // The package might not exist. Don't re-throw the error here.
        console.error("Tried to stat " + binaryPath + " but failed.");
    }
    const findRequiresResult = (0, child_process_1.spawnSync)("/usr/lib/rpm/find-requires", {
        input: binaryPath + "\n",
    });
    if (findRequiresResult.status !== 0) {
        throw new Error(`find-requires failed with exit code ${findRequiresResult.status}.\nstderr: ${findRequiresResult.stderr}`);
    }
    const requires = new Set(findRequiresResult.stdout.toString("utf-8").trimEnd().split("\n"));
    console.log("Requires:");
    console.log(requires);
    return requires;
}
//# sourceMappingURL=calculate-deps.js.map