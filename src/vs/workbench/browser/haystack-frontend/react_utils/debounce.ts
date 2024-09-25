/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"

type Timer = ReturnType<typeof setTimeout>
type SomeFunction = (...args: any[]) => void
/**
 *
 * @param func The original, non debounced function (You can pass any number of args to it)
 * @param delay The delay (in ms) for the function to return
 * @returns The debounced function, which will run only if the debounced function has not been called in the last (delay) ms
 */

export function debounce<Func extends SomeFunction>(
  func: Func,
  delayInMs = 200,
) {
  let timer: Timer

  const debouncedFunction = ((...args) => {
    const newTimer = setTimeout(() => {
      func(...args)
    }, delayInMs)
    clearTimeout(timer)
    timer = newTimer
  }) as Func

  return debouncedFunction
}

export function useDebounce<Func extends SomeFunction>(
  func: Func,
  delayInMs = 200,
  deps: any[],
) {
  return React.useMemo(() => {
    return debounce(func, delayInMs)
  }, deps)
}
