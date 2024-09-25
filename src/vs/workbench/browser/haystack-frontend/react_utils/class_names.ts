/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

export function classNames(classNames: Record<string, boolean>): string {
  const ret: string[] = []
  for (const key in classNames) {
    if (classNames[key]) {
      ret.push(key)
    }
  }
  return ret.join(" ")
}
