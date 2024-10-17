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
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export const enum RecommendationSource {
	FILE = 1,
	WORKSPACE = 2,
	EXE = 3
}

export interface IExtensionRecommendations {
	source: RecommendationSource;
	extensions: string[];
	name: string;
	searchValue?: string;
}

export function RecommendationSourceToString(source: RecommendationSource) {
	switch (source) {
		case RecommendationSource.FILE: return 'file';
		case RecommendationSource.WORKSPACE: return 'workspace';
		case RecommendationSource.EXE: return 'exe';
	}
}

export const enum RecommendationsNotificationResult {
	Ignored = 'ignored',
	Cancelled = 'cancelled',
	TooMany = 'toomany',
	IncompatibleWindow = 'incompatibleWindow',
	Accepted = 'reacted',
}

export const IExtensionRecommendationNotificationService = createDecorator<IExtensionRecommendationNotificationService>('IExtensionRecommendationNotificationService');

export interface IExtensionRecommendationNotificationService {
	readonly _serviceBrand: undefined;

	readonly ignoredRecommendations: string[];
	hasToIgnoreRecommendationNotifications(): boolean;

	promptImportantExtensionsInstallNotification(recommendations: IExtensionRecommendations): Promise<RecommendationsNotificationResult>;
	promptWorkspaceRecommendations(recommendations: Array<string | URI>): Promise<void>;
}

