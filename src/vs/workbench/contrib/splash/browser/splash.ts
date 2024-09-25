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
import { IPartsSplash } from "vs/platform/theme/common/themeService"

export const ISplashStorageService = createDecorator<ISplashStorageService>(
  "ISplashStorageService",
)

export interface ISplashStorageService {
  readonly _serviceBrand: undefined

  saveWindowSplash(splash: IPartsSplash): Promise<void>
}
