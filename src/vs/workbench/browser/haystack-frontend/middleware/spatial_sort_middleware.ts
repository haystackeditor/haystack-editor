/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { Position } from "vs/editor/common/core/position"
import { IRange, Range } from "vs/editor/common/core/range"
import { Rectangle } from "vs/workbench/browser/haystack-frontend/canvas/rectangle"
import { RendererManager } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"
import { SpatialSorter } from "vs/workbench/browser/haystack-frontend/middleware/spatial_sorter"
import {
  CanvasCodeEditor,
  CanvasEditor,
  CanvasEditorType,
  EditorBase,
} from "vs/workbench/browser/haystack-frontend/editor/editor"
import { setDependencyArrows } from "vs/workbench/browser/haystack-frontend/mirror/react_to_pixi"
import { Middleware, MiddlewareType } from "./middleware_common"
import {
  StateEvent,
  StateEventType,
} from "vs/workbench/browser/haystack-frontend/middleware/state_event"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"
import {
  DependencyArrow,
  DependencyArrowType,
  SortSymbolData,
  SymbolRelationship,
} from "vs/workbench/services/haystack/common/haystackService"
import { CancellationTokenSource } from "vs/base/common/cancellation"

interface ColorRelationship {
  color: number
  fromEditorPosition: Position | null
  decorationIds: string[]
}

export class SpatialSortMiddleware implements Middleware {
  public middlewareType = MiddlewareType.SPATIAL_SORT

  private spatialSorter = new SpatialSorter()
  private canvasScale = 1.0
  private isTraversing = false
  private colorRelationshipMap = new Map<
    string,
    Map<string, ColorRelationship>
  >()

  private currentRequestNumber = -1
  private referencesCancellationToken: CancellationTokenSource | null = null

  // If you change these numbers, also change
  // haystack-code-editor/src/vs/editor/browser/widget/diffEditor/style.css
  private freeLightModeColorBuffer = [
    0xa280cc, 0x375fc2, 0xca7137, 0xc27498, 0x9ec2a4, 0xbcb1c8, 0xb47d65,
    0x782525, 0x111e1e, 0xbe87a0, 0xa793ae, 0xc8c9c6, 0x91abbe, 0xacbac4,
    0xcc9d9d, 0xc78e8e, 0xbe909c, 0x66b10f, 0x99ba68, 0x00cc00, 0xa9a2b6,
    0xa790a5, 0xa698a3, 0xaca3b3, 0xbcb1b9, 0xc7c9cc, 0xc0c4cc, 0x83ab4b,
    0x86b680, 0x897b86, 0x786774, 0x99becb, 0xcc9e80, 0x002a49, 0xcccb8a,
    0xccc572, 0x6c6c5f, 0x9a8e80, 0xcc6640, 0xc29657, 0x769e5b, 0x0066b5,
  ]
  private freeDarkModeColorbuffer = [
    0xd9b3ff, 0x6b93ff, 0xffa96c, 0xffacd2, 0xdcffe4, 0xeadbf6, 0xffb695,
    0xb93939, 0x1d3939, 0xeea9c6, 0xe7d0f1, 0xfafbf8, 0xcde8ff, 0xd7e9f5,
    0xffc4c4, 0xf9b1b1, 0xffcbd9, 0x9fff18, 0xd8ff9a, 0x00ff00, 0xece4fc,
    0xe9cce6, 0xe8d6e4, 0xf0e3f8, 0xecdde7, 0xf9fbff, 0xf0f5ff, 0xbcee76,
    0xc0ffb8, 0xc3b2c0, 0xae98aa, 0xc0eeff, 0xffd1c0, 0x004872, 0xfffdad,
    0xfff68f, 0x9e9e8e, 0xd8c8b7, 0xff7f50, 0xf3bb6c, 0xaadc89, 0x009aff,
  ]

  constructor() {}

  private getNextColor() {
    const colorbuffer = WorkspaceStoreWrapper.getWorkspaceState().isDarkMode()
      ? this.freeDarkModeColorbuffer
      : this.freeLightModeColorBuffer
    const nextColor = colorbuffer.pop()!
    colorbuffer.unshift(nextColor)
    return nextColor
  }

  // Useful for immediately propagating arrows e.g. when the user
  // performs go to definition.
  public unconditionallyAddRelationship(
    fromLocationRanges: IRange[],
    fromCanvasEditorId: string,
    toCanvasEditorId: string,
  ) {
    this.spatialSorter.unconditionallyAddRelationship(
      fromLocationRanges,
      fromCanvasEditorId,
      toCanvasEditorId,
    )

    this.generateEditorHighlightsAndColors(
      WorkspaceStoreWrapper.getWorkspaceState().idToEditorMap,
    )

    this.generateDependencyArrows(
      WorkspaceStoreWrapper.getWorkspaceState().idToEditorMap,
    )
  }

  public async handleStoreChange(event: StateEvent) {
    if (this.isTraversing) return

    switch (event.type) {
      case StateEventType.EDITOR_CHANGE: {
        const idToEditorMap = event.currentData
        for (const editor of idToEditorMap.values()) {
          if (
            (editor.type === CanvasEditorType.CODE_EDITOR ||
              editor.type === CanvasEditorType.DIFF_EDITOR ||
              editor.type === CanvasEditorType.GHOST_EDITOR) &&
            editor.identifier == null
          ) {
            // Wait until all editors are mounted.
            return
          }
        }

        // Cancels any current outgoing requests.
        this.referencesCancellationToken?.cancel()
        this.currentRequestNumber++
        const requestNumber = this.currentRequestNumber

        if (
          this.spatialSorter.shouldCacheAndRegenerateRelationships(
            idToEditorMap,
          )
        ) {
          // Clears any arrows pointing to/from removed editors.
          this.generateDependencyArrows(idToEditorMap)
          this.clearHighlightsAndColors(idToEditorMap, event.previousData)

          await this.generateRelationshipMap(requestNumber)
          if (requestNumber !== this.currentRequestNumber) {
            return
          }

          this.generateEditorHighlightsAndColors(idToEditorMap)
        } else if (
          !this.shouldGenerateArrows(idToEditorMap, event.previousData)
        ) {
          return
        }

        this.generateDependencyArrows(idToEditorMap)
        return
      }
      case StateEventType.SCALE_CHANGE: {
        this.canvasScale = event.currentData
        this.generateDependencyArrows(
          WorkspaceStoreWrapper.getWorkspaceState().idToEditorMap,
        )
        break
      }
      case StateEventType.SELECTION_CHANGE: {
        this.spatialSorter.resetIndex()
        break
      }
    }
  }

  private async generateRelationshipMap(requestNumber: number) {
    const symbolData: SortSymbolData[] = []
    for (const canvasEditor of this.spatialSorter.cachedIdToEditorMap.values()) {
      if (
        canvasEditor.type === CanvasEditorType.CODE_EDITOR &&
        canvasEditor.identifier != null &&
        canvasEditor.uri.scheme !== "walkThrough" &&
        canvasEditor.uri.scheme !== "webview-panel" &&
        canvasEditor.uri.path !== "/untitled"
      ) {
        const range =
          canvasEditor.editRange ?? canvasEditor.currentSymbol?.range
        symbolData.push({
          range,
          uri: canvasEditor.uri,
          identifier: canvasEditor.identifier,
          editorId: canvasEditor.uuid,
        })
      }
    }

    const relationships = await this.getSymbolRelationships(symbolData)
    if (requestNumber !== this.currentRequestNumber) {
      return
    }
    this.spatialSorter.buildRelationshipGraph(relationships)
  }

  public refreshDependencyArrows() {
    this.generateDependencyArrows(
      WorkspaceStoreWrapper.getWorkspaceState().idToEditorMap,
    )
  }

  private generateDependencyArrows(idToEditorMap: Map<string, CanvasEditor>) {
    const dependencyArrows: DependencyArrow[] = []
    const symmetricalEditors = new Set<string>()
    const haystackService =
      WorkspaceStoreWrapper.getWorkspaceState().haystackService
    const fileColor = haystackService?.isDarkMode() ? 0xffffff : 0x000000

    for (const [
      fromEditorId,
      relationships,
    ] of this.spatialSorter.relationshipsMap.entries()) {
      const fromEditor = idToEditorMap.get(fromEditorId) as CanvasCodeEditor

      if (
        fromEditor == null ||
        fromEditor.isPinned ||
        fromEditor.identifier == null ||
        haystackService == null
      ) {
        continue
      }

      // const codeEditor = haystackService.getCodeEditor(
      //   fromEditor.identifier.editor,
      //   fromEditor.identifier.groupId
      // )
      // if (codeEditor == null) continue

      for (const relationship of relationships) {
        if (symmetricalEditors.has(relationship.toEditorId)) {
          continue
        }
        const toEditor = idToEditorMap.get(relationship.toEditorId)
        if (toEditor == null || toEditor.isPinned) {
          continue
        }

        // let editorOffset: Vector | null = null

        // const position = this.getPositionOffset(
        //   fromEditorId,
        //   relationship.toEditorId
        // )
        // if (position == null) continue

        // const scrollPosition = codeEditor.getScrolledVisiblePosition({
        //   lineNumber: position.lineNumber,
        //   column: position.column,
        // })

        // if (
        //   scrollPosition &&
        //   scrollPosition.top >= 0 &&
        //   scrollPosition.top < codeEditor.getScrollHeight() &&
        //   scrollPosition.left >= 0 &&
        //   scrollPosition.left < codeEditor.getScrollWidth()
        // ) {
        //   editorOffset = new Vector(
        //     scrollPosition.left,
        //     scrollPosition.top + scrollPosition.height / 2
        //   )
        // }

        // console.log(
        //   "EDITUH OFFSET",
        //   editorOffset,
        //   fromEditor.width,
        //   fromEditor.height
        // )

        const fromEditorSize = new Vector(fromEditor.width, fromEditor.height)
        const toEditorSize = new Vector(toEditor.width, toEditor.height)

        const isSymmetrical =
          this.spatialSorter.relationshipsMap
            .get(relationship.toEditorId)
            ?.find((value) => value.toEditorId === fromEditorId) != null
        if (isSymmetrical) {
          symmetricalEditors.add(fromEditorId)
        }

        // We don't use getEditorPosition here because it's not updated.
        const fromEditorPosition = Vector.add(
          WorkspaceStoreWrapper.getWorkspaceState().canvasCamera,
          new Vector(fromEditor.xPosition, fromEditor.yPosition),
        ).round()
        const toEditorPosition = Vector.add(
          WorkspaceStoreWrapper.getWorkspaceState().canvasCamera,
          new Vector(toEditor.xPosition, toEditor.yPosition),
        ).round()

        const fromSize = Vector.div(fromEditorSize, 2).mul(this.canvasScale)
        const fromPosition = Vector.add(fromEditorPosition, fromSize)
        const toSize = Vector.div(toEditorSize, 2).mul(this.canvasScale)
        const toPosition = Vector.add(toEditorPosition, toSize)

        const delta = Vector.sub(toPosition, fromPosition)

        const fromTicksX =
          delta.x !== 0
            ? fromSize.x / Math.abs(delta.x)
            : Number.MAX_SAFE_INTEGER
        const fromTicksY =
          delta.y !== 0
            ? fromSize.y / Math.abs(delta.y)
            : Number.MAX_SAFE_INTEGER
        const fromTicks = Math.min(fromTicksX, fromTicksY)
        // We don't want dependency arrows for when one editor is inside another.
        if (fromTicks >= 1) continue
        const fromIntersection = Vector.add(
          fromPosition,
          Vector.mul(delta, fromTicks),
        )

        const toTicksX =
          delta.x !== 0 ? toSize.x / Math.abs(delta.x) : Number.MAX_SAFE_INTEGER
        const toTicksY =
          delta.y !== 0 ? toSize.y / Math.abs(delta.y) : Number.MAX_SAFE_INTEGER
        const toTicks = Math.min(toTicksX, toTicksY)
        // We don't want dependency arrows for when one editor is inside another.
        if (toTicks >= 1) continue
        const toIntersection = Vector.sub(
          toPosition,
          Vector.mul(delta, toTicks),
        )

        const color =
          relationship.dependencyArrowType === DependencyArrowType.SAME_FILE
            ? fileColor
            : this.getColor(fromEditorId, relationship.toEditorId)

        dependencyArrows.push({
          from: fromIntersection,
          to: toIntersection,
          symmetrical: isSymmetrical,
          color,
          dependencyArrowType: relationship.dependencyArrowType,
        })
      }
    }

    setDependencyArrows(dependencyArrows, this.canvasScale)
  }

  public goToNextEditor(direction: 1 | -1): CanvasEditor | null {
    this.isTraversing = true
    const nextEditor = this.spatialSorter.getNextEditor(direction)

    if (nextEditor == null) {
      this.isTraversing = false
      return null
    }

    WorkspaceStoreWrapper.getWorkspaceState().selectEditor(
      nextEditor.uuid,
      /* clearSelection */ true,
    )

    WorkspaceStoreWrapper.getWorkspaceState().setFocusEditor(nextEditor.uuid)

    switch (nextEditor.type) {
      case CanvasEditorType.CODE_EDITOR: {
        const haystackService =
          WorkspaceStoreWrapper.getWorkspaceState().haystackService
        if (haystackService == null) break
        const fileEditor = nextEditor as CanvasCodeEditor
        if (fileEditor == null || fileEditor.identifier == null) break
        haystackService.focusOnEditor(fileEditor.identifier)
        break
      }
    }

    this.isTraversing = false
    return nextEditor
  }

  async getSymbolRelationships(
    symbolData: SortSymbolData[],
  ): Promise<SymbolRelationship[]> {
    const haystackService =
      WorkspaceStoreWrapper.getWorkspaceState().haystackService
    if (haystackService == null) return []

    this.referencesCancellationToken = new CancellationTokenSource()

    return haystackService.getSymbolRelationships(
      symbolData,
      this.referencesCancellationToken,
    )
  }

  private shouldGenerateArrows(
    idToEditorMap: Map<string, CanvasEditor>,
    previousIdToEditorMap: Map<string, CanvasEditor>,
  ) {
    if (idToEditorMap.size !== previousIdToEditorMap.size) return true

    for (const [editorId, currentEditor] of idToEditorMap.entries()) {
      const previousEditor = previousIdToEditorMap.get(editorId)

      if (
        previousEditor == null ||
        previousEditor.type !== currentEditor.type ||
        previousEditor.xPosition !== currentEditor.xPosition ||
        previousEditor.yPosition !== currentEditor.yPosition ||
        previousEditor.width !== currentEditor.width ||
        previousEditor.height !== currentEditor.height ||
        previousEditor.isPinned !== currentEditor.isPinned ||
        !Range.equalsRange(
          (previousEditor as EditorBase).currentSymbol?.range,
          (currentEditor as EditorBase).currentSymbol?.range,
        )
      ) {
        return true
      }
    }

    return false
  }

  private generateEditorHighlightsAndColors(
    idToEditorMap: Map<string, CanvasEditor>,
  ): void {
    for (const [
      fromEditorId,
      relationships,
    ] of this.spatialSorter.relationshipsMap.entries()) {
      const fromEditor = idToEditorMap.get(fromEditorId)
      if (fromEditor == null || fromEditor.isPinned) {
        continue
      }

      if (fromEditor.type === CanvasEditorType.CODE_EDITOR) {
        for (const relationship of relationships) {
          if (
            relationship.dependencyArrowType === DependencyArrowType.SAME_FILE
          ) {
            continue
          }

          const toEditor = idToEditorMap.get(relationship.toEditorId)
          if (toEditor == null || toEditor.isPinned) continue

          const existingColorRelationship = this.colorRelationshipMap
            .get(fromEditorId)
            ?.get(relationship.toEditorId)

          if (existingColorRelationship != null) {
            // Checks if we need to perhaps fix up the highlights.
            if (existingColorRelationship.decorationIds.length === 0) {
              existingColorRelationship.decorationIds =
                WorkspaceStoreWrapper.getWorkspaceState().setEditorRelationshipHighlights(
                  fromEditorId,
                  relationship.fromLocationRanges,
                  existingColorRelationship.color,
                )
            }

            continue
          }

          const nextColor = this.getNextColor()
          const decorationIds =
            WorkspaceStoreWrapper.getWorkspaceState().setEditorRelationshipHighlights(
              fromEditorId,
              relationship.fromLocationRanges,
              nextColor,
            )
          const fromPosition =
            relationship.fromLocationRanges.length > 0
              ? new Position(
                  relationship.fromLocationRanges[0].startLineNumber,
                  relationship.fromLocationRanges[0].startColumn,
                )
              : null

          this.setColorRelationship(
            fromEditorId,
            relationship.toEditorId,
            nextColor,
            decorationIds,
            fromPosition,
          )

          // Checks if there's also a symmetrical relationship.
          const toEditorRelationships = this.spatialSorter.relationshipsMap.get(
            relationship.toEditorId,
          )
          if (toEditorRelationships != null) {
            const originaltoEditorId = relationship.toEditorId
            for (const toEditorRelationship of toEditorRelationships) {
              if (
                toEditorRelationship.toEditorId === fromEditorId &&
                toEditorRelationship.dependencyArrowType ===
                  DependencyArrowType.SYMBOL_DEPENDENCY
              ) {
                const decorationIds =
                  WorkspaceStoreWrapper.getWorkspaceState().setEditorRelationshipHighlights(
                    originaltoEditorId,
                    toEditorRelationship.fromLocationRanges,
                    nextColor,
                  )
                const fromPosition =
                  toEditorRelationship.fromLocationRanges.length > 0
                    ? new Position(
                        toEditorRelationship.fromLocationRanges[0].startLineNumber,
                        toEditorRelationship.fromLocationRanges[0].startColumn,
                      )
                    : null
                this.setColorRelationship(
                  originaltoEditorId,
                  toEditorRelationship.toEditorId,
                  nextColor,
                  decorationIds,
                  fromPosition,
                )
              }
            }
          }
        }
      }
    }
  }

  public setColorRelationship(
    editorId: string,
    toEditorId: string,
    nextColor: number,
    decorationIds: string[],
    fromPosition: Position | null,
  ): void {
    let relationships = this.colorRelationshipMap.get(editorId)
    if (relationships == null) {
      relationships = new Map<string, ColorRelationship>()
      this.colorRelationshipMap.set(editorId, relationships)
    }
    relationships.set(toEditorId, {
      color: nextColor,
      decorationIds: decorationIds,
      fromEditorPosition: fromPosition,
    })
  }

  private clearHighlightsAndColors(
    idToEditorMap: Map<string, CanvasEditor>,
    previousIdToEditorMap: Map<string, CanvasEditor>,
  ) {
    const nextColorRelationshipMap: Map<
      string,
      Map<string, ColorRelationship>
    > = new Map()

    for (const [
      fromEditorId,
      relationships,
    ] of this.colorRelationshipMap.entries()) {
      nextColorRelationshipMap.set(fromEditorId, new Map(relationships))
    }

    for (const [
      fromEditorId,
      relationships,
    ] of this.colorRelationshipMap.entries()) {
      const containsfromEditorId = idToEditorMap.has(fromEditorId)
      const previousFromEditor = previousIdToEditorMap.get(fromEditorId)
      const currentFromEditor = idToEditorMap.get(fromEditorId)
      const fromEditorDeepEquals = this.deepEditorEquals(
        previousFromEditor,
        currentFromEditor,
      )

      for (const [toEditorId, colorRelationship] of relationships.entries()) {
        // If the map contains both editor IDs and they're the same, don't change the color.
        const previousToEditor = previousIdToEditorMap.get(toEditorId)
        const currentToEditor = idToEditorMap.get(toEditorId)

        const spatialRelationships =
          this.spatialSorter.relationshipsMap.get(fromEditorId)

        let shouldSkipUnconditionalRelationship = false

        if (spatialRelationships != null) {
          for (const relationship of spatialRelationships) {
            if (
              relationship.dependencyArrowType ===
                DependencyArrowType.SYMBOL_DEPENDENCY &&
              relationship.toEditorId === toEditorId &&
              relationship.unconditional
            ) {
              shouldSkipUnconditionalRelationship = true
              break
            }
          }
        }

        if (shouldSkipUnconditionalRelationship) {
          continue
        }

        if (this.spatialSorter.relationshipsMap.get(fromEditorId))
          if (containsfromEditorId && idToEditorMap.has(toEditorId)) {
            if (
              fromEditorDeepEquals &&
              this.deepEditorEquals(previousToEditor, currentToEditor)
            ) {
              continue
            }
          }

        for (const decorationId of colorRelationship.decorationIds) {
          WorkspaceStoreWrapper.getWorkspaceState().clearEditorRelationshipHighlights(
            (previousFromEditor as CanvasCodeEditor | null)?.identifier ??
              (currentFromEditor as CanvasCodeEditor | null)?.identifier ??
              null,
            decorationId,
          )

          // Checks for symmetrical relationships.
          WorkspaceStoreWrapper.getWorkspaceState().clearEditorRelationshipHighlights(
            (previousToEditor as CanvasCodeEditor | null)?.identifier ??
              (currentToEditor as CanvasCodeEditor | null)?.identifier ??
              null,
            decorationId,
          )
        }

        // Remove the color assignment from the map.
        nextColorRelationshipMap.get(fromEditorId)?.delete(toEditorId)
      }
    }

    for (const fromEditorId of this.colorRelationshipMap.keys()) {
      const relationships = nextColorRelationshipMap.get(fromEditorId)
      if (relationships == null || relationships.size === 0) {
        nextColorRelationshipMap.delete(fromEditorId)
      }
    }

    this.colorRelationshipMap = nextColorRelationshipMap
  }

  public getColor(fromEditorId: string, toEditorId: string): number {
    const colorMap = this.colorRelationshipMap.get(fromEditorId)
    if (colorMap) {
      return colorMap.get(toEditorId)?.color ?? 0x000000
    }
    return 0x000000
  }

  private deepEditorEquals(
    a: CanvasEditor | undefined,
    b: CanvasEditor | undefined,
  ): boolean {
    if (a == null || b == null) return false
    if (a.type !== b.type) return false

    return (
      (a as EditorBase).identifier?.editor ===
        (b as EditorBase).identifier?.editor &&
      (a as EditorBase).identifier?.groupId ===
        (b as EditorBase).identifier?.groupId &&
      a.isPinned === b.isPinned &&
      Range.equalsRange(
        (a as EditorBase).currentSymbol?.range,
        (b as EditorBase).currentSymbol?.range,
      )
    )
  }

  public getNthEditorInViewport(n: number): CanvasEditor | null {
    let counter = 0
    const canvasScale = WorkspaceStoreWrapper.getWorkspaceState().canvasScale
    const viewportSizeInViewportSpace =
      RendererManager.getInstance().getViewportDimensions()
    const viewportBounds = Rectangle.fromPositionAndSize(
      Vector.new(),
      viewportSizeInViewportSpace,
    )

    for (const editor of this.spatialSorter.getSortedEditors()) {
      const editorPositionInViewportSpace =
        WorkspaceStoreWrapper.getWorkspaceState().getEditorPosition(editor.uuid)
      const editorSizeInViewportSpace = new Vector(
        editor.width,
        editor.height,
      ).mul(canvasScale)

      const editorBounds = Rectangle.fromPositionAndSize(
        editorPositionInViewportSpace,
        editorSizeInViewportSpace,
      )

      // Skip editors whose position is completely offscreen.
      if (!viewportBounds.intersects(editorBounds)) {
        continue
      }

      ++counter
      if (counter === n || (counter === 10 && n === 0)) {
        return editor
      }
    }

    return null
  }

  public getEditorEnumerationInViewport(
    canvasEditor: CanvasEditor,
  ): number | null {
    let counter = 1
    const canvasScale = WorkspaceStoreWrapper.getWorkspaceState().canvasScale
    const viewportSizeInViewportSpace =
      RendererManager.getInstance().getViewportDimensions()
    const viewportBounds = Rectangle.fromPositionAndSize(
      Vector.new(),
      viewportSizeInViewportSpace,
    )

    for (const editor of this.spatialSorter.getSortedEditors()) {
      const editorPositionInViewportSpace =
        WorkspaceStoreWrapper.getWorkspaceState().getEditorPosition(editor.uuid)
      const editorSizeInViewportSpace = new Vector(
        editor.width,
        editor.height,
      ).mul(canvasScale)

      const editorBounds = Rectangle.fromPositionAndSize(
        editorPositionInViewportSpace,
        editorSizeInViewportSpace,
      )

      // Skip editors whose position is completely offscreen.
      if (!viewportBounds.intersects(editorBounds)) {
        continue
      }

      if (editor.uuid === canvasEditor.uuid) {
        if (counter === 10) return 0

        return counter
      }

      ++counter
    }

    return null
  }

  public getSortedEditors(): CanvasEditor[] {
    return this.spatialSorter.getSortedEditors()
  }
}
