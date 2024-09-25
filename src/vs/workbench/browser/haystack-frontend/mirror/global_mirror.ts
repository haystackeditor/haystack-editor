/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { getGlobalState } from "../global_state/global_store"

export function startQuitModal() {
  getGlobalState().setIsQuitting(true)
}
