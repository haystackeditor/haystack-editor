"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.gulpPostcss = gulpPostcss;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const postcss_1 = require("postcss");
const es = require("event-stream");
function gulpPostcss(plugins, handleError) {
    const instance = (0, postcss_1.default)(plugins);
    return es.map((file, callback) => {
        if (file.isNull()) {
            return callback(null, file);
        }
        if (file.isStream()) {
            return callback(new Error("Streaming not supported"));
        }
        instance
            .process(file.contents.toString(), { from: file.path })
            .then((result) => {
            file.contents = Buffer.from(result.css);
            callback(null, file);
        })
            .catch((error) => {
            if (handleError) {
                handleError(error);
                callback();
            }
            else {
                callback(error);
            }
        });
    });
}
//# sourceMappingURL=postcss.js.map