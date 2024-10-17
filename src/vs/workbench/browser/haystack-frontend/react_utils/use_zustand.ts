/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import {
  useDebugValue,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react"
import type { StoreApi } from "zustand"

function is(x: any, y: any) {
  return (
    (x === y && (x !== 0 || 1 / x === 1 / y)) || (x !== x && y !== y) // eslint-disable-line no-self-compare
  )
}

// Same as useSyncExternalStore, but supports selector and isEqual arguments.
function useSyncExternalStoreWithSelector<Snapshot, Selection>(
  subscribe: (arg: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot: void | null | (() => Snapshot),
  selector: (snapshot: Snapshot) => Selection,
  isEqual?: (a: Selection, b: Selection) => boolean
): Selection {
  interface Inst {
    hasValue: boolean
    value: Selection | null
  }

  // Use this to track the rendered snapshot.
  const instRef: React.MutableRefObject<Inst | null> = useRef(null)
  let inst: Inst
  if (instRef.current === null) {
    inst = {
      hasValue: false,
      value: null,
    }
    instRef.current = inst
  } else {
    inst = instRef.current
  }

  const [getSelection, getServerSelection] = useMemo(() => {
    // Track the memoized state using closure variables that are local to this
    // memoized instance of a getSnapshot function. Intentionally not using a
    // useRef hook, because that state would be shared across all concurrent
    // copies of the hook/component.
    let hasMemo = false
    let memoizedSnapshot: Snapshot | null = null
    let memoizedSelection: Selection | null = null
    const memoizedSelector = (nextSnapshot: Snapshot) => {
      if (!hasMemo) {
        // The first time the hook is called, there is no memoized result.
        hasMemo = true
        memoizedSnapshot = nextSnapshot
        const nextSelection = selector(nextSnapshot)
        if (isEqual !== undefined) {
          // Even if the selector has changed, the currently rendered selection
          // may be equal to the new selection. We should attempt to reuse the
          // current value if possible, to preserve downstream memoizations.
          if (inst.hasValue) {
            const currentSelection = inst.value!
            if (isEqual(currentSelection, nextSelection)) {
              memoizedSelection = currentSelection
              return currentSelection
            }
          }
        }
        memoizedSelection = nextSelection
        return nextSelection
      }

      // We may be able to reuse the previous invocation's result.
      const prevSnapshot: Snapshot | null = memoizedSnapshot
      const prevSelection: Selection | null = memoizedSelection

      if (is(prevSnapshot, nextSnapshot)) {
        // The snapshot is the same as last time. Reuse the previous selection.
        return prevSelection
      }

      // The snapshot has changed, so we need to compute a new selection.
      const nextSelection = selector(nextSnapshot)

      // If a custom isEqual function is provided, use that to check if the data
      // has changed. If it hasn't, return the previous selection. That signals
      // to React that the selections are conceptually equal, and we can bail
      // out of rendering.
      if (
        isEqual !== undefined &&
        prevSelection != null &&
        isEqual(prevSelection, nextSelection)
      ) {
        return prevSelection
      }

      memoizedSelection = nextSelection
      return nextSelection
    }
    // Assigning this to a constant so that Flow knows it can't change.
    const maybeGetServerSnapshot =
      getServerSnapshot === undefined ? null : getServerSnapshot
    const getSnapshotWithSelector = () => memoizedSelector(getSnapshot())
    const getServerSnapshotWithSelector =
      maybeGetServerSnapshot === null
        ? undefined
        : () => memoizedSelector(maybeGetServerSnapshot())
    return [getSnapshotWithSelector, getServerSnapshotWithSelector]
  }, [getSnapshot, getServerSnapshot, selector, isEqual])

  const value = useSyncExternalStore(
    subscribe,
    getSelection,
    getServerSelection
  )

  useEffect(() => {
    inst.hasValue = true
    inst.value = value
  }, [value])

  useDebugValue(value)
  return value!
}

export function useZustand<State, Slice>(
  store: StoreApi<State>,
  selector: (state: State) => Slice,
  areEqual: (a: Slice, b: Slice) => boolean = Object.is
) {
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getInitialState,
    selector,
    areEqual
  )
}
