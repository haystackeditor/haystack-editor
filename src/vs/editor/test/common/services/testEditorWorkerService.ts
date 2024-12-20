/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/base/common/uri';
import { IRange } from 'vs/editor/common/core/range';
import { DiffAlgorithmName, IEditorWorkerService, IUnicodeHighlightsResult } from 'vs/editor/common/services/editorWorker';
import { TextEdit, IInplaceReplaceSupportResult } from 'vs/editor/common/languages';
import { IDocumentDiff, IDocumentDiffProviderOptions } from 'vs/editor/common/diff/documentDiffProvider';
import { IChange } from 'vs/editor/common/diff/legacyLinesDiffComputer';
import { SectionHeader } from 'vs/editor/common/services/findSectionHeaders';

export class TestEditorWorkerService implements IEditorWorkerService {

	declare readonly _serviceBrand: undefined;

	canComputeUnicodeHighlights(uri: URI): boolean { return false; }
	async computedUnicodeHighlights(uri: URI): Promise<IUnicodeHighlightsResult> { return { ranges: [], hasMore: false, ambiguousCharacterCount: 0, invisibleCharacterCount: 0, nonBasicAsciiCharacterCount: 0 }; }
	async computeDiff(original: URI, modified: URI, options: IDocumentDiffProviderOptions, algorithm: DiffAlgorithmName): Promise<IDocumentDiff | null> { return null; }
	canComputeDirtyDiff(original: URI, modified: URI): boolean { return false; }
	async computeDirtyDiff(original: URI, modified: URI, ignoreTrimWhitespace: boolean): Promise<IChange[] | null> { return null; }
	async computeMoreMinimalEdits(resource: URI, edits: TextEdit[] | null | undefined): Promise<TextEdit[] | undefined> { return undefined; }
	async computeHumanReadableDiff(resource: URI, edits: TextEdit[] | null | undefined): Promise<TextEdit[] | undefined> { return undefined; }
	canComputeWordRanges(resource: URI): boolean { return false; }
	async computeWordRanges(resource: URI, range: IRange): Promise<{ [word: string]: IRange[] } | null> { return null; }
	canNavigateValueSet(resource: URI): boolean { return false; }
	async navigateValueSet(resource: URI, range: IRange, up: boolean): Promise<IInplaceReplaceSupportResult | null> { return null; }
	async findSectionHeaders(uri: URI): Promise<SectionHeader[]> { return []; }
}
