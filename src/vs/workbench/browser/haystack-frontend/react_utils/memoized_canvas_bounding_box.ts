/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { useEffect, useState } from "react"

export function useMemoizedCanvasBoundingBox() {
  const [boundingBox, setBoundingBox] = useState<DOMRect | null>(null)

  useEffect(() => {
    const resizer = document.getElementById("pixi-resizer") as HTMLDivElement
    const resizeObserver = new ResizeObserver(() => {
      setBoundingBox(resizer.getBoundingClientRect())
    })
    resizeObserver.observe(resizer)
  }, [])

  return boundingBox
}
