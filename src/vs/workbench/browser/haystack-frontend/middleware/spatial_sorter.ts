/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import {
  CanvasEditor,
  EditorBase,
} from "vs/workbench/browser/haystack-frontend/editor/editor"
import { Rectangle } from "vs/workbench/browser/haystack-frontend/canvas/rectangle"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import {
  WorkspaceStoreWrapper,
  getSizeForEditor,
} from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import {
  getCanvasPosition,
  getViewportBounds,
  transformFromViewportToCanvas,
} from "vs/workbench/browser/haystack-frontend/mirror/react_to_pixi"
import {
  DependencyArrowType,
  SymbolRelationship,
} from "vs/workbench/services/haystack/common/haystackService"
import { IRange, Range } from "vs/editor/common/core/range"

const enum SortEditorType {
  EDITOR = 0,
  ROW = 1,
  COL = 2,
}

interface SortEditor {
  canvasEditor: CanvasEditor | null
  parent: SortEditor | null
  children: SortEditor[]
  sortEditorType: SortEditorType
  xPosition: number
  yPosition: number
  width: number
  height: number
}

type Relationship = SameFile | SymbolToSymbolRelationship

type SameFile = {
  toEditorId: string
  dependencyArrowType: DependencyArrowType.SAME_FILE
}

type SymbolToSymbolRelationship = {
  fromLocationRanges: IRange[]
  toEditorId: string
  dependencyArrowType: DependencyArrowType.SYMBOL_DEPENDENCY
}

export class SpatialSorter {
  public relationshipsMap: Map<string, Relationship[]> = new Map()
  public cachedIdToEditorMap: Map<string, CanvasEditor> = new Map()

  private sortedEditors: CanvasEditor[] = []
  private idToSortEditor: Map<string, SortEditor> = new Map()

  private currentIndex: number | null = null
  private isDirty = true

  constructor() {}

  public getSortedEditors() {
    if (this.isDirty) {
      this.sortEditors()

      WorkspaceStoreWrapper.getWorkspaceState().setSortedEditors(
        this.sortedEditors,
      )
    }
    return this.sortedEditors
  }

  public shouldCacheAndRegenerateRelationships(
    idToEditorMap: Map<string, CanvasEditor>,
  ): boolean {
    let numTargetEditors = 0

    let needsRecache = this.cachedIdToEditorMap.size !== idToEditorMap.size

    for (const [editorId, currentEditor] of idToEditorMap.entries()) {
      // Avoid unnecessary hashing.
      if (!needsRecache && !this.cachedIdToEditorMap.has(editorId)) {
        this.isDirty = true
        needsRecache = true
      } else if (!needsRecache) {
        const cachedEditor = this.cachedIdToEditorMap.get(editorId)
        if (
          cachedEditor == null ||
          cachedEditor.type !== currentEditor.type ||
          (cachedEditor as EditorBase).identifier !==
            (currentEditor as EditorBase).identifier ||
          cachedEditor.isPinned !== currentEditor.isPinned ||
          !Range.equalsRange(
            (cachedEditor as EditorBase).currentSymbol?.range,
            (currentEditor as EditorBase).currentSymbol?.range,
          )
        ) {
          this.isDirty = true
          needsRecache = true
        }
      }

      ++numTargetEditors
    }

    // We need to re-sort regardless of whether we need to regenerate
    // relationships.
    this.isDirty = true
    this.cachedIdToEditorMap = idToEditorMap

    if (needsRecache) {
      return true
    } else {
      return false
    }
  }

  public sortEditors(): void {
    const roots = this.buildTree()
    const sortedRoots = this.groupAndSortEditors(roots)
    // We do a DFS to sort all canvas editors.
    const treeStack: SortEditor[] = [...sortedRoots]
    const visited: Set<string> = new Set()
    this.sortedEditors = []
    while (treeStack.length) {
      const nextEditor = treeStack.pop()!
      switch (nextEditor.sortEditorType) {
        case SortEditorType.EDITOR: {
          if (nextEditor.canvasEditor == null) continue
          if (visited.has(nextEditor.canvasEditor.uuid)) continue
          visited.add(nextEditor.canvasEditor.uuid)
          this.sortedEditors.push(nextEditor.canvasEditor)
          const sortedChildren = this.groupAndSortEditors(nextEditor.children)
          treeStack.push(...sortedChildren)
          break
        }
        case SortEditorType.ROW:
        case SortEditorType.COL: {
          const sortedChildren = nextEditor.children
          this.sortGroup(sortedChildren)
          treeStack.push(...sortedChildren)
          break
        }
      }
    }
    this.isDirty = false
  }

  private buildTree(): SortEditor[] {
    this.idToSortEditor = new Map<string, SortEditor>()

    const roots = []

    for (const editor of this.cachedIdToEditorMap.values()) {
      const editorSize = getSizeForEditor(editor)
      const sortEditor: SortEditor = {
        canvasEditor: editor,
        parent: null,
        children: [],
        sortEditorType: SortEditorType.EDITOR,
        xPosition: editor.xPosition,
        yPosition: editor.yPosition,
        width: editorSize.x,
        height: editorSize.y,
      }
      roots.push(sortEditor)
    }

    return roots
  }

  private detectCycle(
    sortEditorRoot: SortEditor,
    localVisited: Set<SortEditor>,
    globalVisited: Set<SortEditor>,
  ): boolean {
    const editorStack: SortEditor[] = [sortEditorRoot]
    localVisited.add(sortEditorRoot)
    let isCycle = false

    while (editorStack.length) {
      const sortEditor = editorStack.pop()!
      for (const child of sortEditor.children) {
        if (localVisited.has(child)) {
          isCycle = true
          continue
        } else if (globalVisited.has(child)) {
          continue
        }
        localVisited.add(child)
        globalVisited.add(child)
        editorStack.push(child)
      }
    }

    return isCycle
  }

  public buildRelationshipGraph(relationships: SymbolRelationship[]): void {
    this.relationshipsMap = new Map()
    const relationshipGroupingMap = new Map<string, Map<string, Relationship>>()

    for (const relationship of relationships) {
      let relationshipsOfEditor = relationshipGroupingMap.get(
        relationship.fromEditorId,
      )

      if (relationshipsOfEditor == null) {
        relationshipsOfEditor = new Map()
        relationshipGroupingMap.set(
          relationship.fromEditorId,
          relationshipsOfEditor,
        )
      }

      const existingRelationship = relationshipsOfEditor.get(
        relationship.toEditorId,
      )

      if (
        relationship.relationshipType === DependencyArrowType.SYMBOL_DEPENDENCY
      ) {
        if (existingRelationship == null) {
          relationshipsOfEditor.set(relationship.toEditorId, {
            fromLocationRanges: [relationship.fromLocationRange],
            toEditorId: relationship.toEditorId,
            dependencyArrowType: relationship.relationshipType,
          })
        } else if (
          existingRelationship.dependencyArrowType ===
          DependencyArrowType.SYMBOL_DEPENDENCY
        ) {
          existingRelationship.fromLocationRanges.push(
            relationship.fromLocationRange,
          )
        }
      } else {
        relationshipsOfEditor.set(relationship.toEditorId, {
          toEditorId: relationship.toEditorId,
          dependencyArrowType: relationship.relationshipType,
        })
      }
    }

    for (const [fromEditorId, relationshipMap] of relationshipGroupingMap) {
      const relationships: Relationship[] = []
      for (const relationship of relationshipMap.values()) {
        relationships.push(relationship)
      }
      this.relationshipsMap.set(fromEditorId, relationships)
    }
  }

  private groupAndSortEditors(sortEditors: SortEditor[]) {
    let groupedAndSortedNodes = this.groupEditorsByRow(sortEditors)
    groupedAndSortedNodes = this.groupEditorsByCol(groupedAndSortedNodes)
    this.sortGroup(groupedAndSortedNodes)
    return groupedAndSortedNodes
  }

  private sortGroup(group: SortEditor[]) {
    // Sorts by manhattan distance. Note that we sort in descending order
    // because stack is last in, last out.
    group.sort((a, b) => b.xPosition + b.yPosition - a.xPosition - a.yPosition)
  }

  private groupEditorsByRow(sortEditors: SortEditor[]): SortEditor[] {
    const sortedGroup: SortEditor[] = []
    // Sorts by Y position to allow a one-shot pass.
    sortEditors.sort((a, b) => a.yPosition - b.yPosition)
    let currentRow: SortEditor | null = null

    for (const sortEditor of sortEditors) {
      if (currentRow == null) {
        currentRow = {
          canvasEditor: null,
          parent: null,
          children: [sortEditor],
          sortEditorType: SortEditorType.ROW,
          xPosition: sortEditor.xPosition,
          yPosition: sortEditor.yPosition,
          width: sortEditor.width,
          height: sortEditor.height,
        }
      } else {
        if (sortEditor.yPosition <= currentRow.yPosition + currentRow.height) {
          currentRow.children.push(sortEditor)

          currentRow.xPosition = Math.min(
            sortEditor.xPosition,
            currentRow.xPosition,
          )
          currentRow.width = Math.max(
            sortEditor.xPosition + sortEditor.width - currentRow.xPosition,
            currentRow.width,
          )
          currentRow.height = Math.max(
            sortEditor.yPosition + sortEditor.height - currentRow.yPosition,
            currentRow.height,
          )
        } else {
          if (currentRow.children.length > 1) {
            sortedGroup.push(currentRow)
          } else {
            sortedGroup.push(currentRow.children[0])
          }
          currentRow = {
            canvasEditor: null,
            parent: null,
            children: [sortEditor],
            sortEditorType: SortEditorType.ROW,
            xPosition: sortEditor.xPosition,
            yPosition: sortEditor.yPosition,
            width: sortEditor.width,
            height: sortEditor.height,
          }
        }
      }
    }

    if (currentRow != null) {
      if (currentRow.children.length > 1) {
        sortedGroup.push(currentRow)
      } else {
        sortedGroup.push(currentRow.children[0])
      }
    }

    return sortedGroup
  }

  private groupEditorsByCol(sortEditors: SortEditor[]): SortEditor[] {
    const sortedGroup: SortEditor[] = []
    // Sorts by X position to allow a one-shot pass.
    sortEditors.sort((a, b) => a.xPosition - b.xPosition)
    let currentCol: SortEditor | null = null
    for (const sortEditor of sortEditors) {
      if (currentCol == null) {
        currentCol = {
          canvasEditor: null,
          parent: null,
          children: [sortEditor],
          sortEditorType: SortEditorType.COL,
          xPosition: sortEditor.xPosition,
          yPosition: sortEditor.yPosition,
          width: sortEditor.width,
          height: sortEditor.height,
        }
      } else {
        if (sortEditor.xPosition <= currentCol.xPosition + currentCol.width) {
          currentCol.children.push(sortEditor)

          currentCol.yPosition = Math.min(
            sortEditor.yPosition,
            currentCol.yPosition,
          )
          currentCol.height = Math.max(
            sortEditor.yPosition + sortEditor.height - currentCol.yPosition,
            currentCol.height,
          )
          currentCol.width = Math.max(
            sortEditor.xPosition + sortEditor.width - currentCol.xPosition,
            currentCol.width,
          )
        } else {
          if (currentCol.children.length > 1) {
            sortedGroup.push(currentCol)
          } else {
            sortedGroup.push(currentCol.children[0])
          }
          currentCol = {
            canvasEditor: null,
            parent: null,
            children: [sortEditor],
            sortEditorType: SortEditorType.COL,
            xPosition: sortEditor.xPosition,
            yPosition: sortEditor.yPosition,
            width: sortEditor.width,
            height: sortEditor.height,
          }
        }
      }
    }
    if (currentCol != null) {
      if (currentCol.children.length > 1) {
        sortedGroup.push(currentCol)
      } else {
        sortedGroup.push(currentCol.children[0])
      }
    }
    return sortedGroup
  }

  public getNextEditor(direction: 1 | -1) {
    if (this.isDirty) {
      this.sortEditors()
      this.currentIndex = null
    }
    if (this.sortedEditors.length === 0) return null
    if (this.currentIndex == null) {
      this.currentIndex = this.getClosestEditorIndex(direction)
    } else if (direction === -1 && this.currentIndex === 0) {
      this.currentIndex = this.sortedEditors.length - 1
    } else if (
      direction === 1 &&
      this.currentIndex === this.sortedEditors.length - 1
    ) {
      this.currentIndex = 0
    } else {
      this.currentIndex += direction
    }

    if (this.currentIndex == null) return null

    return this.sortedEditors[this.currentIndex]
  }

  private getClosestEditorIndex(direction: 1 | -1) {
    let minDist = Number.MAX_SAFE_INTEGER
    let closestEditorIndex: number | null = null
    const canvasPosition = getCanvasPosition()
    const scale = WorkspaceStoreWrapper.getWorkspaceState().canvasScale
    let index = 0
    const viewportBounds = getViewportBounds()

    // If we have a single selection. Just use that.
    const selection = WorkspaceStoreWrapper.getWorkspaceState().selection

    if (selection.size === 1) {
      for (const canvasEditor of this.sortedEditors) {
        const currentIndex = index
        ++index

        if (selection.has(canvasEditor.uuid)) {
          if (direction === 1) {
            return currentIndex === this.sortedEditors.length - 1
              ? 0
              : currentIndex + 1
          } else {
            return currentIndex === 0
              ? this.sortEditors.length - 1
              : currentIndex - 1
          }
        }
      }
    }

    // First pass of only roots inside the viewport.
    for (const canvasEditor of this.sortedEditors) {
      const currentIndex = index
      ++index

      const sortEditor = this.idToSortEditor.get(canvasEditor.uuid)
      // We only want roots as candidates.
      if (sortEditor == null || sortEditor.parent != null) continue
      const editorPosition =
        WorkspaceStoreWrapper.getWorkspaceState().getEditorPosition(
          canvasEditor.uuid,
        )
      const transformedPosition = transformFromViewportToCanvas(
        editorPosition,
        scale,
      )
      const size = getSizeForEditor(canvasEditor)
      const bounds = Rectangle.fromPositionAndSize(transformedPosition, size)
      if (!viewportBounds.containsBounds(bounds)) continue

      const editorDistFromCenter = Vector.sub(
        canvasPosition,
        transformedPosition,
      ).magSquared()
      if (editorDistFromCenter < minDist) {
        minDist = editorDistFromCenter
        closestEditorIndex = currentIndex
      }
    }

    if (closestEditorIndex != null) {
      return closestEditorIndex
    }

    index = 0
    // Second pass, go through everything in the viewport
    for (const canvasEditor of this.sortedEditors) {
      const currentIndex = index
      ++index
      const editorPosition =
        WorkspaceStoreWrapper.getWorkspaceState().getEditorPosition(
          canvasEditor.uuid,
        )
      const transformedPosition = transformFromViewportToCanvas(
        editorPosition,
        scale,
      )
      const size = getSizeForEditor(canvasEditor)
      const bounds = Rectangle.fromPositionAndSize(transformedPosition, size)
      if (!viewportBounds.containsBounds(bounds)) continue

      const editorDistFromCenter = Vector.sub(
        canvasPosition,
        transformedPosition,
      ).magSquared()
      if (editorDistFromCenter < minDist) {
        minDist = editorDistFromCenter
        closestEditorIndex = currentIndex
      }
    }

    if (closestEditorIndex != null) {
      return closestEditorIndex
    }

    index = 0
    // Third pass, go through everything
    for (const canvasEditor of this.sortedEditors) {
      const currentIndex = index
      ++index
      const editorPosition =
        WorkspaceStoreWrapper.getWorkspaceState().getEditorPosition(
          canvasEditor.uuid,
        )
      const transformedPosition = transformFromViewportToCanvas(
        editorPosition,
        scale,
      )

      const editorDistFromCenter = Vector.sub(
        canvasPosition,
        transformedPosition,
      ).magSquared()
      if (editorDistFromCenter < minDist) {
        minDist = editorDistFromCenter
        closestEditorIndex = currentIndex
      }
    }

    return closestEditorIndex
  }

  public unconditionallyAddRelationship(
    fromLocationRanges: IRange[],
    fromEditorId: string,
    toEditorId: string,
  ) {
    let existingRelationships = this.relationshipsMap.get(fromEditorId)
    if (existingRelationships == null) {
      existingRelationships = []
      this.relationshipsMap.set(fromEditorId, existingRelationships)
    }
    existingRelationships.push({
      dependencyArrowType: DependencyArrowType.SYMBOL_DEPENDENCY,
      fromLocationRanges,
      toEditorId: toEditorId,
    })
  }

  public resetIndex() {
    this.currentIndex = null
  }
}
