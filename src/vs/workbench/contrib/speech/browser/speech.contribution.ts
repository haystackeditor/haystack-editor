/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { InstantiationType, registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ISpeechService } from 'vs/workbench/contrib/speech/common/speechService';
import { SpeechService } from 'vs/workbench/contrib/speech/browser/speechService';

registerSingleton(ISpeechService, SpeechService, InstantiationType.Eager /* Reads Extension Points */);
