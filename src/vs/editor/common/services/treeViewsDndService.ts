/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
  InstantiationType,
  registerSingleton,
} from "vs/platform/instantiation/common/extensions"
import { createDecorator } from "vs/platform/instantiation/common/instantiation"
import { VSDataTransfer } from "vs/base/common/dataTransfer"
import {
  ITreeViewsDnDService as ITreeViewsDnDServiceCommon,
  TreeViewsDnDService,
} from "vs/editor/common/services/treeViewsDnd"

export interface ITreeViewsDnDService
  extends ITreeViewsDnDServiceCommon<VSDataTransfer> {}
export const ITreeViewsDnDService = createDecorator<ITreeViewsDnDService>(
  "treeViewsDndService",
)
registerSingleton(
  ITreeViewsDnDService,
  TreeViewsDnDService,
  InstantiationType.Delayed,
)
