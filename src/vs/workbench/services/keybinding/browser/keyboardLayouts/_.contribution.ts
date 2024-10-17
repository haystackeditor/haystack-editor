/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IKeymapInfo } from 'vs/workbench/services/keybinding/common/keymapInfo';

export class KeyboardLayoutContribution {
	public static readonly INSTANCE: KeyboardLayoutContribution = new KeyboardLayoutContribution();

	private _layoutInfos: IKeymapInfo[] = [];

	get layoutInfos() {
		return this._layoutInfos;
	}

	private constructor() {
	}

	registerKeyboardLayout(layout: IKeymapInfo) {
		this._layoutInfos.push(layout);
	}
}