"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the Functional Source License. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function log(...args) {
    console.log(`[${new Date().toLocaleTimeString("en", { hour12: false })}]`, "[distro]", ...args);
}
function main() {
    const quality = process.env["VSCODE_QUALITY"];
    if (!quality) {
        throw new Error("Missing VSCODE_QUALITY, skipping mixin");
    }
    log(`Mixing in distro quality...`);
    const basePath = `.build/distro/mixin/${quality}`;
    for (const name of fs.readdirSync(basePath)) {
        const distroPath = path.join(basePath, name);
        const ossPath = path.relative(basePath, distroPath);
        if (ossPath === "product.json") {
            const distro = JSON.parse(fs.readFileSync(distroPath, "utf8"));
            const oss = JSON.parse(fs.readFileSync(ossPath, "utf8"));
            let builtInExtensions = oss.builtInExtensions;
            if (Array.isArray(distro.builtInExtensions)) {
                log("Overwriting built-in extensions:", distro.builtInExtensions.map((e) => e.name));
                builtInExtensions = distro.builtInExtensions;
            }
            else if (distro.builtInExtensions) {
                const include = distro.builtInExtensions["include"] ?? [];
                const exclude = distro.builtInExtensions["exclude"] ?? [];
                log("OSS built-in extensions:", builtInExtensions.map((e) => e.name));
                log("Including built-in extensions:", include.map((e) => e.name));
                log("Excluding built-in extensions:", exclude);
                builtInExtensions = builtInExtensions.filter((ext) => !include.find((e) => e.name === ext.name) &&
                    !exclude.find((name) => name === ext.name));
                builtInExtensions = [...builtInExtensions, ...include];
                log("Final built-in extensions:", builtInExtensions.map((e) => e.name));
            }
            else {
                log("Inheriting OSS built-in extensions", builtInExtensions.map((e) => e.name));
            }
            const result = {
                webBuiltInExtensions: oss.webBuiltInExtensions,
                ...distro,
                builtInExtensions,
            };
            fs.writeFileSync(ossPath, JSON.stringify(result, null, "\t"), "utf8");
        }
        else {
            fs.cpSync(distroPath, ossPath, { force: true, recursive: true });
        }
        log(distroPath, "✔︎");
    }
}
main();
//# sourceMappingURL=mixin-quality.js.map