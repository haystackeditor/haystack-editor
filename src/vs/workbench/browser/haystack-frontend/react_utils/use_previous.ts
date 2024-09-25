/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"

export function usePrevious<T>(value: T, defaultToNull: boolean): T | null {
  const ref = React.useRef<T | null>(defaultToNull ? null : value)

  React.useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}
