"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

export type DrawerMode = "evidence" | "transcript"

interface ReviewSelectionState {
  hoveredSegmentIds: ReadonlySet<string>
  activeSegmentIds: ReadonlySet<string>
  drawerOpen: boolean
  drawerMode: DrawerMode
  drawerSegmentIds: ReadonlySet<string>
}

interface ReviewSelectionActions {
  setHovered: (segmentIds: string[] | null) => void
  focusSegments: (segmentIds: string[]) => void
  registerSegment: (id: string, node: HTMLElement) => void
  unregisterSegment: (id: string, node: HTMLElement) => void
  openDrawer: (mode: DrawerMode, segmentIds?: string[]) => void
  closeDrawer: () => void
  toggleDrawer: (mode: DrawerMode) => void
}

interface ReviewSelectionStore {
  getSnapshot: () => ReviewSelectionState
  subscribe: (listener: () => void) => () => void
  actions: ReviewSelectionActions
}

const ReviewSelectionContext = createContext<ReviewSelectionStore | null>(null)

export function ReviewSelectionProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createReviewSelectionStore)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || !store.getSnapshot().drawerOpen) {
        return
      }

      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return
      }

      store.actions.closeDrawer()
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [store])

  return (
    <ReviewSelectionContext.Provider value={store}>
      {children}
    </ReviewSelectionContext.Provider>
  )
}

function createReviewSelectionStore(): ReviewSelectionStore {
  let state: ReviewSelectionState = {
    hoveredSegmentIds: new Set(),
    activeSegmentIds: new Set(),
    drawerOpen: false,
    drawerMode: "evidence",
    drawerSegmentIds: new Set(),
  }

  const listeners = new Set<() => void>()
  const segmentNodes = new Map<string, Set<HTMLElement>>()
  const pendingFocus = { current: null as string[] | null }
  const activeTimer = { current: null as ReturnType<typeof setTimeout> | null }

  function notify() {
    listeners.forEach((listener) => listener())
  }

  function setState(next: ReviewSelectionState) {
    if (next === state) {
      return
    }
    state = next
    notify()
  }

  function updateState(
    updater: (current: ReviewSelectionState) => ReviewSelectionState
  ) {
    setState(updater(state))
  }

  function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>) {
    if (a.size !== b.size) {
      return false
    }

    for (const value of a) {
      if (!b.has(value)) {
        return false
      }
    }

    return true
  }

  function scrollAndFlash(segmentIds: string[]) {
    if (segmentIds.length === 0) {
      return
    }

    const firstId = segmentIds[0]
    const set = segmentNodes.get(firstId)
    let target: HTMLElement | undefined

    if (set && set.size > 0) {
      const nodes = Array.from(set)
      target = nodes.find((node) => node.offsetParent !== null) ?? nodes[0]
    }

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" })
    } else {
      pendingFocus.current = segmentIds
    }

    updateState((current) => {
      const nextActive = new Set(segmentIds)
      if (sameSet(current.activeSegmentIds, nextActive)) {
        return current
      }
      return {
        ...current,
        activeSegmentIds: nextActive,
      }
    })

    if (activeTimer.current) {
      clearTimeout(activeTimer.current)
    }
    activeTimer.current = setTimeout(() => {
      updateState((current) => {
        if (current.activeSegmentIds.size === 0) {
          return current
        }
        return {
          ...current,
          activeSegmentIds: new Set(),
        }
      })
    }, 1800)
  }

  const actions: ReviewSelectionActions = {
    setHovered(segmentIds) {
      updateState((current) => {
        const nextHovered = segmentIds ? new Set(segmentIds) : new Set<string>()
        if (sameSet(current.hoveredSegmentIds, nextHovered)) {
          return current
        }
        return {
          ...current,
          hoveredSegmentIds: nextHovered,
        }
      })
    },
    focusSegments(segmentIds) {
      scrollAndFlash(segmentIds)
    },
    registerSegment(id, node) {
      let set = segmentNodes.get(id)
      if (!set) {
        set = new Set()
        segmentNodes.set(id, set)
      }
      set.add(node)

      if (pendingFocus.current && pendingFocus.current[0] === id) {
        const ids = pendingFocus.current
        pendingFocus.current = null
        requestAnimationFrame(() => scrollAndFlash(ids))
      }
    },
    unregisterSegment(id, node) {
      const set = segmentNodes.get(id)
      if (!set) {
        return
      }
      set.delete(node)
      if (set.size === 0) {
        segmentNodes.delete(id)
      }
    },
    openDrawer(mode, segmentIds) {
      updateState((current) => {
        const nextSegmentIds =
          mode === "evidence" && segmentIds && segmentIds.length > 0
            ? new Set(segmentIds)
            : new Set<string>()

        if (
          current.drawerOpen &&
          current.drawerMode === mode &&
          sameSet(current.drawerSegmentIds, nextSegmentIds)
        ) {
          return current
        }

        if (mode === "evidence" && segmentIds && segmentIds.length > 0) {
          pendingFocus.current = segmentIds
        }

        return {
          ...current,
          drawerOpen: true,
          drawerMode: mode,
          drawerSegmentIds: nextSegmentIds,
        }
      })
    },
    closeDrawer() {
      updateState((current) => {
        if (!current.drawerOpen) {
          return current
        }

        return {
          ...current,
          drawerOpen: false,
        }
      })
    },
    toggleDrawer(mode) {
      updateState((current) => {
        if (current.drawerOpen && current.drawerMode === mode) {
          return {
            ...current,
            drawerOpen: false,
          }
        }

        return {
          ...current,
          drawerOpen: true,
          drawerMode: mode,
          drawerSegmentIds:
            mode === "transcript" ? new Set() : current.drawerSegmentIds,
        }
      })
    },
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    actions,
  }
}

function useReviewSelectionStore() {
  const ctx = useContext(ReviewSelectionContext)
  if (!ctx) {
    throw new Error(
      "useReviewSelection must be used inside <ReviewSelectionProvider>"
    )
  }
  return ctx
}

export function useReviewSelectionSelector<T>(
  selector: (state: ReviewSelectionState) => T
): T {
  const store = useReviewSelectionStore()
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(store.getSnapshot())
  )
}

export function useReviewSelectionActions(): ReviewSelectionActions {
  return useReviewSelectionStore().actions
}

export function useOptionalReviewSelectionActions(): ReviewSelectionActions | null {
  return useContext(ReviewSelectionContext)?.actions ?? null
}
