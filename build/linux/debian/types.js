"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDebianArchString = isDebianArchString;
function isDebianArchString(s) {
    return ["amd64", "armhf", "arm64"].includes(s);
}
//# sourceMappingURL=types.js.map