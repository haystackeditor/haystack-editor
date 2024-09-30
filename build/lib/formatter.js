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
exports.format = format;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ts = __importStar(require("typescript"));
class LanguageServiceHost {
    files = {};
    addFile(fileName, text) {
        this.files[fileName] = ts.ScriptSnapshot.fromString(text);
    }
    fileExists(path) {
        return !!this.files[path];
    }
    readFile(path) {
        return this.files[path]?.getText(0, this.files[path].getLength());
    }
    // for ts.LanguageServiceHost
    getCompilationSettings = () => ts.getDefaultCompilerOptions();
    getScriptFileNames = () => Object.keys(this.files);
    getScriptVersion = (_fileName) => "0";
    getScriptSnapshot = (fileName) => this.files[fileName];
    getCurrentDirectory = () => process.cwd();
    getDefaultLibFileName = (options) => ts.getDefaultLibFilePath(options);
}
const defaults = {
    baseIndentSize: 0,
    indentSize: 4,
    tabSize: 4,
    indentStyle: ts.IndentStyle.Smart,
    newLineCharacter: "\r\n",
    convertTabsToSpaces: false,
    insertSpaceAfterCommaDelimiter: true,
    insertSpaceAfterSemicolonInForStatements: true,
    insertSpaceBeforeAndAfterBinaryOperators: true,
    insertSpaceAfterConstructor: false,
    insertSpaceAfterKeywordsInControlFlowStatements: true,
    insertSpaceAfterFunctionKeywordForAnonymousFunctions: false,
    insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
    insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
    insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
    insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: false,
    insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: false,
    insertSpaceAfterTypeAssertion: false,
    insertSpaceBeforeFunctionParenthesis: false,
    placeOpenBraceOnNewLineForFunctions: false,
    placeOpenBraceOnNewLineForControlBlocks: false,
    insertSpaceBeforeTypeAnnotation: false,
};
const getOverrides = (() => {
    let value;
    return () => {
        value ??= JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "tsfmt.json"), "utf8"));
        return value;
    };
})();
function format(fileName, text) {
    const host = new LanguageServiceHost();
    host.addFile(fileName, text);
    const languageService = ts.createLanguageService(host);
    const edits = languageService.getFormattingEditsForDocument(fileName, {
        ...defaults,
        ...getOverrides(),
    });
    edits
        .sort((a, b) => a.span.start - b.span.start)
        .reverse()
        .forEach((edit) => {
        const head = text.slice(0, edit.span.start);
        const tail = text.slice(edit.span.start + edit.span.length);
        text = `${head}${edit.newText}${tail}`;
    });
    return text;
}
//# sourceMappingURL=formatter.js.map