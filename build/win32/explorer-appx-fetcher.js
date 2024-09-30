/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the Functional Source License. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadExplorerAppx = downloadExplorerAppx;
const fs = __importStar(require("fs"));
const debug_1 = __importDefault(require("debug"));
const extract_zip_1 = __importDefault(require("extract-zip"));
const path = __importStar(require("path"));
const get_1 = require("@electron/get");
const root = path.dirname(path.dirname(__dirname));
const d = (0, debug_1.default)("explorer-appx-fetcher");
async function downloadExplorerAppx(outDir, quality = "stable", targetArch = "x64") {
    const fileNamePrefix = quality === "insider" ? "code_insiders" : "code";
    const fileName = `${fileNamePrefix}_explorer_${targetArch}.zip`;
    if (await fs.existsSync(path.resolve(outDir, "resources.pri"))) {
        return;
    }
    if (!(await fs.existsSync(outDir))) {
        await fs.mkdirSync(outDir, { recursive: true });
    }
    d(`downloading ${fileName}`);
    const artifact = await (0, get_1.downloadArtifact)({
        isGeneric: true,
        version: "3.0.4",
        artifactName: fileName,
        unsafelyDisableChecksums: true,
        mirrorOptions: {
            mirror: "https://github.com/microsoft/vscode-explorer-command/releases/download/",
            customDir: "3.0.4",
            customFilename: fileName,
        },
    });
    d(`unpacking from ${fileName}`);
    await (0, extract_zip_1.default)(artifact, { dir: fs.realpathSync(outDir) });
}
async function main(outputDir) {
    const arch = process.env["VSCODE_ARCH"];
    if (!outputDir) {
        throw new Error("Required build env not set");
    }
    const product = JSON.parse(fs.readFileSync(path.join(root, "product.json"), "utf8"));
    await downloadExplorerAppx(outputDir, product.quality, arch);
}
if (require.main === module) {
    main(process.argv[2]).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
//# sourceMappingURL=explorer-appx-fetcher.js.map