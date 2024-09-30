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
exports.getProductionDependencies = getProductionDependencies;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cp = __importStar(require("child_process"));
const parseSemver = require("parse-semver");
const root = fs.realpathSync(path.dirname(path.dirname(__dirname)));
function asYarnDependency(prefix, tree) {
    let parseResult;
    try {
        parseResult = parseSemver(tree.name);
    }
    catch (err) {
        err.message += `: ${tree.name}`;
        console.warn(`Could not parse semver: ${tree.name}`);
        return null;
    }
    // not an actual dependency in disk
    if (parseResult.version !== parseResult.range) {
        return null;
    }
    const name = parseResult.name;
    const version = parseResult.version;
    const dependencyPath = path.join(prefix, name);
    const children = [];
    for (const child of tree.children || []) {
        const dep = asYarnDependency(path.join(prefix, name, "node_modules"), child);
        if (dep) {
            children.push(dep);
        }
    }
    return { name, version, path: dependencyPath, children };
}
function getYarnProductionDependencies(folderPath) {
    const raw = cp.execSync("yarn list --json", {
        cwd: folderPath,
        encoding: "utf8",
        env: { ...process.env, NODE_ENV: "production" },
        stdio: [null, null, "inherit"],
    });
    const match = /^{"type":"tree".*$/m.exec(raw);
    if (!match || match.length !== 1) {
        throw new Error("Could not parse result of `yarn list --json`");
    }
    const trees = JSON.parse(match[0]).data.trees;
    return trees
        .map((tree) => asYarnDependency(path.join(folderPath, "node_modules"), tree))
        .filter((dep) => !!dep);
}
function getProductionDependencies(folderPath) {
    const result = [];
    const deps = getYarnProductionDependencies(folderPath);
    const flatten = (dep) => {
        result.push({ name: dep.name, version: dep.version, path: dep.path });
        dep.children.forEach(flatten);
    };
    deps.forEach(flatten);
    // Account for distro npm dependencies
    const realFolderPath = fs.realpathSync(folderPath);
    const relativeFolderPath = path.relative(root, realFolderPath);
    const distroPackageJsonPath = `${root}/.build/distro/npm/${relativeFolderPath}/package.json`;
    if (fs.existsSync(distroPackageJsonPath)) {
        const distroPackageJson = JSON.parse(fs.readFileSync(distroPackageJsonPath, "utf8"));
        const distroDependencyNames = Object.keys(distroPackageJson.dependencies ?? {});
        for (const name of distroDependencyNames) {
            result.push({
                name,
                version: distroPackageJson.dependencies[name],
                path: path.join(realFolderPath, "node_modules", name),
            });
        }
    }
    return [...new Set(result)];
}
if (require.main === module) {
    console.log(JSON.stringify(getProductionDependencies(root), null, "  "));
}
//# sourceMappingURL=dependencies.js.map