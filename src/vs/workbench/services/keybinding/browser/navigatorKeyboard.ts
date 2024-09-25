/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IKeyboard {
  getLayoutMap(): Promise<Object>
  lock(keyCodes?: string[]): Promise<void>
  unlock(): void
  addEventListener?(type: string, listener: () => void): void
}
export type INavigatorWithKeyboard = Navigator & {
  keyboard: IKeyboard
}
