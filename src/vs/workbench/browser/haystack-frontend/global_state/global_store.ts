/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { createStore } from "zustand/vanilla"
import { devtools } from "zustand/middleware"
import { ITextModel } from "vs/editor/common/model"
import { useZustand } from "vs/workbench/browser/haystack-frontend/react_utils/use_zustand"
import type { FileDir } from "code-graph"

export const enum ReactScene {
  FILE_BROWSER = 0,
  WORKSPACE = 1,
}

export const enum ReactFileDirType {
  UNKNOWN = 0,
  FILE = 1,
  DIR = 2,
  ROOT = 3,
}

export interface ReactFileDir {
  name: string
  filePath: string
  fileDirType: ReactFileDirType
  depth: number
  id: number
  parent: number
  children: number[]
  hidden: boolean
}

export interface ContextMenuActionGroup {
  actions: ContextMenuAction[]
  id: string
}

export interface ContextMenuAction {
  id: string
  label: string
  triggerAction: (...args: any[]) => void
}

export interface ContextMenuArgs {
  topOffset: number
  leftOffset: number
  actionGroups: ContextMenuActionGroup[]
}

export interface GenericInputArgs {
  onCompletion: (input: string) => void
  onCancel: () => void
  placeholder: string
}

type ListenerFunction = () => void
const fileDirInitializationListeners: ListenerFunction[] = []

export interface GlobalState {
  currentScene: ReactScene
  rootDirName: string
  fileDirs: ReactFileDir[]
  selection: Set<number>
  contextMenuArgs: ContextMenuArgs | null
  genericInputArgs: GenericInputArgs | null
  documentVersionMap: Map<string, number>
  filePathToEditors: Map<string, ITextModel[]>
  isQuitting: boolean
  initializedFileDirs: Promise<boolean>
  setScene: (scene: ReactScene) => void
  setFileDirs: (fileDirs: FileDir[]) => void
  addFileDir: (fileDir: ReactFileDir) => void
  createContextMenu: (
    leftOffset: number,
    topOffset: number,
    actionGroups: ContextMenuActionGroup[],
  ) => void
  closeContextMenu: () => void
  openGenericInput: (args: GenericInputArgs) => void
  closeGenericInput: () => void
  contextMenuIsOpen: () => boolean
  setRootDir: (rootDir: string) => void
  addEditorModel: (filePath: string, model: ITextModel) => void
  removeEditorModel: (filePath: string, model: ITextModel) => void
  fileDirFromPath: (filePath: string) => ReactFileDir | null
  setIsQuitting: (isQuitting: boolean) => void
}

const globalStore = createStore<GlobalState>()(
  devtools(
    (set, get) => ({
      currentScene: ReactScene.WORKSPACE as ReactScene,
      rootDirName: "/Users/akshaysubramaniam/Documents/code-graph",
      fileDirs: new Array<ReactFileDir>(),
      selection: new Set(),
      contextMenuArgs: null as ContextMenuArgs | null,
      genericInputArgs: null as GenericInputArgs | null,
      documentVersionMap: new Map(),
      filePathToEditors: new Map(),
      isQuitting: false as boolean,
      initializedFileDirs: new Promise((resolve) => {
        fileDirInitializationListeners.push(() => resolve(true))
      }),
      setScene: (scene: ReactScene) => {
        set({ currentScene: scene })
      },
      setFileDirs: (fileDirs: FileDir[]) => {
        const reactFileDirs = new Array<ReactFileDir>(fileDirs.length)
        interface StackEl {
          index: number
          depth: number
        }
        const fileDirStack: StackEl[] = [{ index: 0, depth: 0 }]
        while (fileDirStack.length) {
          const { index, depth } = fileDirStack.pop()!
          const fileDir = fileDirs[index]
          let reactFileDirType = ReactFileDirType.UNKNOWN
          const fileDirNumType = fileDir.fileDirType as number
          if (fileDirNumType === 1 || fileDirNumType === 2) {
            reactFileDirType = ReactFileDirType.DIR
          } else if (fileDirNumType === 3) {
            reactFileDirType = ReactFileDirType.FILE
          } else {
            continue
          }
          const children: number[] = []
          for (const range of fileDir.children) {
            for (let i = range.start; i < range.end; ++i) {
              fileDirStack.push({ index: i, depth: depth + 1 })
              children.push(i)
            }
          }
          reactFileDirs[fileDir.id] = {
            name: fileDir.name,
            filePath: fileDir.path,
            fileDirType: reactFileDirType,
            depth,
            id: fileDir.id,
            parent: fileDir.parent,
            children: children,
            hidden: false,
          }
        }
        set({ fileDirs: reactFileDirs })

        for (const listener of fileDirInitializationListeners) {
          listener()
        }
      },
      addFileDir: (fileDir: ReactFileDir) => {
        const fileDirs = [...get().fileDirs]
        if (fileDir.id < fileDirs.length) {
          fileDirs[fileDir.id] = fileDir
        } else {
          fileDirs.push(fileDir)
        }
        set({ fileDirs })
      },
      createContextMenu: (
        leftOffset: number,
        topOffset: number,
        actionGroups: ContextMenuActionGroup[],
      ) => {
        set({
          contextMenuArgs: {
            topOffset,
            leftOffset,
            actionGroups,
          },
        })
      },
      closeContextMenu: () => {
        set({ contextMenuArgs: null })
      },
      openGenericInput: (args: GenericInputArgs) => {
        set({ genericInputArgs: args })
      },
      closeGenericInput: () => {
        set({ genericInputArgs: null })
      },
      contextMenuIsOpen: () => {
        return get().contextMenuArgs != null
      },
      setRootDir: (rootDir: string) => {
        set({ rootDirName: rootDir })
      },
      addEditorModel: (filePath: string, model: ITextModel) => {
        const filePathToEditors = new Map(get().filePathToEditors)
        if (filePathToEditors.has(filePath)) {
          filePathToEditors.get(filePath)!.push(model)
        } else {
          filePathToEditors.set(filePath, [model])
        }
        set({ filePathToEditors })
      },
      removeEditorModel: (filePath: string, model: ITextModel) => {
        const filePathToEditors = new Map(get().filePathToEditors)
        const models = filePathToEditors.get(filePath)
        if (models == null) return
        const index = models.indexOf(model)
        models.splice(index, 1)
        set({ filePathToEditors })
      },
      fileDirFromPath: (filePath: string) => {
        for (const fileDir of get().fileDirs) {
          if (fileDir.filePath === filePath) {
            return fileDir
          }
        }
        return null
      },
      setIsQuitting: (isQuitting: boolean) => {
        set({ isQuitting })
      },
    }),
    {
      name: "browser-storage",
    },
  ),
)

export function getGlobalState(): GlobalState {
  return globalStore.getState()
}

export function useGlobalState<T>(selector: (state: GlobalState) => T): T {
  return useZustand(globalStore, selector)
}
