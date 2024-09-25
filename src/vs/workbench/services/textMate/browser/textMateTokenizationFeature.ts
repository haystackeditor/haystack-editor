/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from "vs/platform/instantiation/common/instantiation"
import type { IGrammar } from "vscode-textmate"

export const ITextMateTokenizationService =
  createDecorator<ITextMateTokenizationService>("textMateTokenizationFeature")

export interface ITextMateTokenizationService {
  readonly _serviceBrand: undefined

  createTokenizer(languageId: string): Promise<IGrammar | null>

  startDebugMode(printFn: (str: string) => void, onStop: () => void): void
}
