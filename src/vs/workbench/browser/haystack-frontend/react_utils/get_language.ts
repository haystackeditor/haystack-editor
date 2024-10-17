/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

export type Language =
    | 'python'
    | 'ruby'
    | 'csharp'
    | 'typescript'
    | 'javascript'
    | 'json'
    | 'html'
    | 'css'
    | 'markdown'
    | 'rust'

export function getLanguage(fileName: string): Language {
    const extension = fileName.substring(fileName.lastIndexOf('.') + 1)
    switch (extension) {
        case 'rs':
            return 'rust'
        case 'py':
            return 'python'
        case 'rb':
            return 'ruby'
        case 'ts':
        case 'tsx':
            return 'typescript'
        case 'js':
        case 'jsx':
            return 'javascript'
        case 'html':
            return 'html'
        case 'css':
        case 'scss':
            return 'css'
        default:
            return 'markdown'
    }
}
