/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerAction2 } from "vs/platform/actions/common/actions"
import {
  MergeEditorOpenContentsFromJSON,
  OpenSelectionInTemporaryMergeEditor,
} from "vs/workbench/contrib/mergeEditor/electron-sandbox/devCommands"

// Dev Commands
registerAction2(MergeEditorOpenContentsFromJSON)
registerAction2(OpenSelectionInTemporaryMergeEditor)
