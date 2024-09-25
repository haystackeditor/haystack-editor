/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import "vs/css!./media/editordroptarget"
import { DataTransfers } from "vs/base/browser/dnd"
import {
  addDisposableListener,
  DragAndDropObserver,
  EventHelper,
  EventType,
  getWindow,
} from "vs/base/browser/dom"
import { renderFormattedText } from "vs/base/browser/formattedTextRenderer"
import { RunOnceScheduler } from "vs/base/common/async"
import { toDisposable } from "vs/base/common/lifecycle"
import { isMacintosh, isWeb } from "vs/base/common/platform"
import { assertAllDefined, assertIsDefined } from "vs/base/common/types"
import { localize } from "vs/nls"
import { IConfigurationService } from "vs/platform/configuration/common/configuration"
import { IInstantiationService } from "vs/platform/instantiation/common/instantiation"
import { Registry } from "vs/platform/registry/common/platform"
import { activeContrastBorder } from "vs/platform/theme/common/colorRegistry"
import { IThemeService, Themable } from "vs/platform/theme/common/themeService"
import {
  isTemporaryWorkspace,
  IWorkspaceContextService,
} from "vs/platform/workspace/common/workspace"
import {
  CodeDataTransfers,
  containsDragType,
  Extensions as DragAndDropExtensions,
  IDragAndDropContributionRegistry,
  IDraggedResourceEditorInput,
  LocalSelectionTransfer,
} from "vs/platform/dnd/browser/dnd"
import {
  DraggedEditorGroupIdentifier,
  DraggedEditorIdentifier,
  extractTreeDropData,
  ResourcesDropHandler,
} from "vs/workbench/browser/dnd"
import {
  EDITOR_DRAG_AND_DROP_BACKGROUND,
  EDITOR_DROP_INTO_PROMPT_BACKGROUND,
  EDITOR_DROP_INTO_PROMPT_BORDER,
  EDITOR_DROP_INTO_PROMPT_FOREGROUND,
} from "vs/workbench/common/theme"
import {
  GroupDirection,
  IEditorGroupsService,
} from "vs/workbench/services/editor/common/editorGroupsService"
import { ITreeViewsDnDService } from "vs/editor/common/services/treeViewsDndService"
import { DraggedTreeItemsIdentifier } from "vs/editor/common/services/treeViewsDnd"
import { IHaystackService } from "vs/workbench/services/haystack/common/haystackService"

interface IDropOperation {
  splitDirection?: GroupDirection
}

function isDropIntoEditorEnabledGlobally(
  configurationService: IConfigurationService,
) {
  return configurationService.getValue<boolean>("editor.dropIntoEditor.enabled")
}

function isDragIntoEditorEvent(e: DragEvent): boolean {
  return e.shiftKey
}

class DropOverlay extends Themable {
  private static readonly OVERLAY_ID = "monaco-workbench-editor-drop-overlay"

  private container: HTMLElement | undefined
  private overlay: HTMLElement | undefined
  private dropIntoPromptElement?: HTMLSpanElement

  private currentDropOperation: IDropOperation | undefined

  private _disposed: boolean | undefined
  get disposed(): boolean {
    return !!this._disposed
  }

  private cleanupOverlayScheduler: RunOnceScheduler

  private readonly editorTransfer =
    LocalSelectionTransfer.getInstance<DraggedEditorIdentifier>()
  private readonly groupTransfer =
    LocalSelectionTransfer.getInstance<DraggedEditorGroupIdentifier>()
  private readonly treeItemsTransfer =
    LocalSelectionTransfer.getInstance<DraggedTreeItemsIdentifier>()

  private readonly enableDropIntoEditor: boolean

  constructor(
    private readonly targetElement: HTMLElement,
    @IThemeService themeService: IThemeService,
    @IConfigurationService
    private readonly configurationService: IConfigurationService,
    @IInstantiationService
    private readonly instantiationService: IInstantiationService,
    @IEditorGroupsService
    private readonly editorGroupService: IEditorGroupsService,
    @ITreeViewsDnDService
    private readonly treeViewsDragAndDropService: ITreeViewsDnDService,
    @IWorkspaceContextService
    private readonly contextService: IWorkspaceContextService,
    @IHaystackService private readonly haystackService: IHaystackService,
  ) {
    super(themeService)

    this.cleanupOverlayScheduler = this._register(
      new RunOnceScheduler(() => this.dispose(), 300),
    )

    this.enableDropIntoEditor =
      isDropIntoEditorEnabledGlobally(this.configurationService) &&
      this.isDropIntoActiveEditorEnabled()

    this.create()
  }

  private create(): void {
    const overlayOffsetHeight = this.getOverlayOffsetHeight()

    // Container
    const container = (this.container = document.createElement("div"))
    container.id = DropOverlay.OVERLAY_ID
    container.style.top = `${overlayOffsetHeight}px`

    // Parent
    this.targetElement.appendChild(container)
    this.targetElement.classList.add("dragged-over")
    this._register(
      toDisposable(() => {
        this.targetElement.removeChild(container)
        this.targetElement.classList.remove("dragged-over")
      }),
    )

    // Overlay
    this.overlay = document.createElement("div")
    this.overlay.classList.add("editor-group-overlay-indicator")
    container.appendChild(this.overlay)

    if (this.enableDropIntoEditor) {
      this.dropIntoPromptElement = renderFormattedText(
        localize(
          "dropIntoEditorPrompt",
          "Hold __{0}__ to drop into editor",
          isMacintosh ? "⇧" : "Shift",
        ),
        {},
      )
      this.dropIntoPromptElement.classList.add(
        "editor-group-overlay-drop-into-prompt",
      )
      this.overlay.appendChild(this.dropIntoPromptElement)
    }

    // Overlay Event Handling
    this.registerListeners(container)

    // Styles
    this.updateStyles()
  }

  override updateStyles(): void {
    const overlay = assertIsDefined(this.overlay)

    // Overlay drop background
    overlay.style.backgroundColor =
      this.getColor(EDITOR_DRAG_AND_DROP_BACKGROUND) || ""

    // Overlay contrast border (if any)
    const activeContrastBorderColor = this.getColor(activeContrastBorder)
    overlay.style.outlineColor = activeContrastBorderColor || ""
    overlay.style.outlineOffset = activeContrastBorderColor ? "-2px" : ""
    overlay.style.outlineStyle = activeContrastBorderColor ? "dashed" : ""
    overlay.style.outlineWidth = activeContrastBorderColor ? "2px" : ""

    if (this.dropIntoPromptElement) {
      this.dropIntoPromptElement.style.backgroundColor =
        this.getColor(EDITOR_DROP_INTO_PROMPT_BACKGROUND) ?? ""
      this.dropIntoPromptElement.style.color =
        this.getColor(EDITOR_DROP_INTO_PROMPT_FOREGROUND) ?? ""

      const borderColor = this.getColor(EDITOR_DROP_INTO_PROMPT_BORDER)
      if (borderColor) {
        this.dropIntoPromptElement.style.borderWidth = "1px"
        this.dropIntoPromptElement.style.borderStyle = "solid"
        this.dropIntoPromptElement.style.borderColor = borderColor
      } else {
        this.dropIntoPromptElement.style.borderWidth = "0"
      }
    }
  }

  private registerListeners(container: HTMLElement): void {
    this._register(
      new DragAndDropObserver(container, {
        onDragOver: (e) => {
          if (this.enableDropIntoEditor && isDragIntoEditorEvent(e)) {
            this.dispose()
            return
          }

          const isDraggingGroup = this.groupTransfer.hasData(
            DraggedEditorGroupIdentifier.prototype,
          )
          const isDraggingEditor = this.editorTransfer.hasData(
            DraggedEditorIdentifier.prototype,
          )

          // Update the dropEffect to "copy" if there is no local data to be dragged because
          // in that case we can only copy the data into and not move it from its source
          if (!isDraggingEditor && !isDraggingGroup && e.dataTransfer) {
            e.dataTransfer.dropEffect = "copy"
          }

          // Position overlay and conditionally enable or disable
          // editor group splitting support based on setting and
          // keymodifiers used.
          let splitOnDragAndDrop =
            !!this.editorGroupService.partOptions.splitOnDragAndDrop
          if (this.isToggleSplitOperation(e)) {
            splitOnDragAndDrop = !splitOnDragAndDrop
          }

          this.positionOverlay(
            e.offsetX,
            e.offsetY,
            isDraggingGroup,
            splitOnDragAndDrop,
          )

          // Make sure to stop any running cleanup scheduler to remove the overlay
          if (this.cleanupOverlayScheduler.isScheduled()) {
            this.cleanupOverlayScheduler.cancel()
          }
        },

        onDragLeave: (e) => this.dispose(),
        onDragEnd: (e) => this.dispose(),

        onDrop: (e) => {
          EventHelper.stop(e, true)

          // Dispose overlay
          this.dispose()

          // Handle drop if we have a valid operation
          if (this.currentDropOperation) {
            this.handleDrop(e, this.currentDropOperation.splitDirection)
          }
        },
      }),
    )

    this._register(
      addDisposableListener(container, EventType.MOUSE_OVER, () => {
        // Under some circumstances we have seen reports where the drop overlay is not being
        // cleaned up and as such the editor area remains under the overlay so that you cannot
        // type into the editor anymore. This seems related to using VMs and DND via host and
        // guest OS, though some users also saw it without VMs.
        // To protect against this issue we always destroy the overlay as soon as we detect a
        // mouse event over it. The delay is used to guarantee we are not interfering with the
        // actual DROP event that can also trigger a mouse over event.
        if (!this.cleanupOverlayScheduler.isScheduled()) {
          this.cleanupOverlayScheduler.schedule()
        }
      }),
    )
  }

  private isDropIntoActiveEditorEnabled(): boolean {
    return true
  }

  private async handleDrop(
    event: DragEvent,
    splitDirection?: GroupDirection,
  ): Promise<void> {
    // Check for group transfer
    if (this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype)) {
      const data = this.groupTransfer.getData(
        DraggedEditorGroupIdentifier.prototype,
      )
      if (Array.isArray(data) && data.length > 0) {
        this.groupTransfer.clearData(DraggedEditorGroupIdentifier.prototype)
      }
    }

    // Check for editor transfer
    else if (this.editorTransfer.hasData(DraggedEditorIdentifier.prototype)) {
      const data = this.editorTransfer.getData(
        DraggedEditorIdentifier.prototype,
      )
      if (Array.isArray(data) && data.length > 0) {
        this.editorTransfer.clearData(DraggedEditorIdentifier.prototype)
      }
    }

    // Check for tree items
    else if (
      this.treeItemsTransfer.hasData(DraggedTreeItemsIdentifier.prototype)
    ) {
      const data = this.treeItemsTransfer.getData(
        DraggedTreeItemsIdentifier.prototype,
      )
      if (Array.isArray(data) && data.length > 0) {
        const editors: IDraggedResourceEditorInput[] = []
        for (const id of data) {
          const dataTransferItem =
            await this.treeViewsDragAndDropService.removeDragOperationTransfer(
              id.identifier,
            )
          if (dataTransferItem) {
            const treeDropData = await extractTreeDropData(dataTransferItem)
            editors.push(
              ...treeDropData.map((editor) => ({
                ...editor,
                options: { ...editor.options, pinned: true },
              })),
            )
          }
        }
        if (editors.length) {
          for (const editor of editors) {
            this.haystackService.createFileEditor(editor.resource)
          }
        }
      }

      this.treeItemsTransfer.clearData(DraggedTreeItemsIdentifier.prototype)
    }

    // Check for URI transfer
    else {
      const dropHandler = this.instantiationService.createInstance(
        ResourcesDropHandler,
        {
          allowWorkspaceOpen:
            !isWeb || isTemporaryWorkspace(this.contextService.getWorkspace()),
        },
      )

      dropHandler.handleDrop(
        event,
        getWindow(this.targetElement),
        (targetGroup) => targetGroup?.focus(),
      )
    }
  }

  private isToggleSplitOperation(e: DragEvent): boolean {
    return (e.altKey && !isMacintosh) || (e.shiftKey && isMacintosh)
  }

  private positionOverlay(
    mousePosX: number,
    mousePosY: number,
    isDraggingGroup: boolean,
    enableSplitting: boolean,
  ): void {
    this.doPositionOverlay({
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
    })
    this.toggleDropIntoPrompt(true)

    // Make sure the overlay is visible now
    const overlay = assertIsDefined(this.overlay)
    overlay.style.opacity = "1"

    // Enable transition after a timeout to prevent initial animation
    setTimeout(() => overlay.classList.add("overlay-move-transition"), 0)

    this.currentDropOperation = { splitDirection: undefined }
  }

  private doPositionOverlay(options: {
    top: string
    left: string
    width: string
    height: string
  }): void {
    const [container, overlay] = assertAllDefined(this.container, this.overlay)

    // Container
    const offsetHeight = this.getOverlayOffsetHeight()
    if (offsetHeight) {
      container.style.height = `calc(100% - ${offsetHeight}px)`
    } else {
      container.style.height = "100%"
    }

    // Overlay
    overlay.style.top = options.top
    overlay.style.left = options.left
    overlay.style.width = options.width
    overlay.style.height = options.height
  }

  private getOverlayOffsetHeight(): number {
    // Without tabs or empty group: use entire editor area as drop target
    return 0
  }

  private toggleDropIntoPrompt(showing: boolean) {
    if (!this.dropIntoPromptElement) {
      return
    }
    this.dropIntoPromptElement.style.opacity = showing ? "1" : "0"
  }

  contains(element: HTMLElement): boolean {
    return element === this.container || element === this.overlay
  }

  override dispose(): void {
    super.dispose()

    this._disposed = true
  }
}

export class EditorDropTarget extends Themable {
  private _overlay?: DropOverlay

  private counter = 0

  private readonly editorTransfer =
    LocalSelectionTransfer.getInstance<DraggedEditorIdentifier>()
  private readonly groupTransfer =
    LocalSelectionTransfer.getInstance<DraggedEditorGroupIdentifier>()

  constructor(
    private readonly container: HTMLElement,
    @IThemeService themeService: IThemeService,
    @IConfigurationService
    private readonly configurationService: IConfigurationService,
    @IInstantiationService
    private readonly instantiationService: IInstantiationService,
  ) {
    super(themeService)

    this.registerListeners()
  }

  private get overlay(): DropOverlay | undefined {
    if (this._overlay && !this._overlay.disposed) {
      return this._overlay
    }

    return undefined
  }

  private registerListeners(): void {
    this._register(
      addDisposableListener(this.container, EventType.DRAG_ENTER, (e) =>
        this.onDragEnter(e),
      ),
    )
    this._register(
      addDisposableListener(this.container, EventType.DRAG_LEAVE, () =>
        this.onDragLeave(),
      ),
    )
    for (const target of [this.container, getWindow(this.container)]) {
      this._register(
        addDisposableListener(target, EventType.DRAG_END, () =>
          this.onDragEnd(),
        ),
      )
    }
  }

  private onDragEnter(event: DragEvent): void {
    if (
      isDropIntoEditorEnabledGlobally(this.configurationService) &&
      isDragIntoEditorEvent(event)
    ) {
      return
    }

    this.counter++

    // Validate transfer
    if (
      !this.editorTransfer.hasData(DraggedEditorIdentifier.prototype) &&
      !this.groupTransfer.hasData(DraggedEditorGroupIdentifier.prototype) &&
      event.dataTransfer
    ) {
      const dndContributions = Registry.as<IDragAndDropContributionRegistry>(
        DragAndDropExtensions.DragAndDropContribution,
      ).getAll()
      const dndContributionKeys = Array.from(dndContributions).map(
        (e) => e.dataFormatKey,
      )
      if (
        !containsDragType(
          event,
          DataTransfers.FILES,
          CodeDataTransfers.FILES,
          DataTransfers.RESOURCES,
          CodeDataTransfers.EDITORS,
          ...dndContributionKeys,
        )
      ) {
        // see https://github.com/microsoft/vscode/issues/25789
        event.dataTransfer.dropEffect = "none"
        return // unsupported transfer
      }
    }

    // Signal DND start
    this.updateContainer(true)

    const target = event.target as HTMLElement
    if (target) {
      // Somehow we managed to move the mouse quickly out of the current overlay, so destroy it
      if (this.overlay && !this.overlay.contains(target)) {
        this.disposeOverlay()
      }

      // Create overlay over target
      if (!this.overlay) {
        this._overlay = this.instantiationService.createInstance(
          DropOverlay,
          this.container,
        )
      }
    }
  }

  private onDragLeave(): void {
    this.counter--

    if (this.counter === 0) {
      this.updateContainer(false)
    }
  }

  private onDragEnd(): void {
    this.counter = 0

    this.updateContainer(false)
    this.disposeOverlay()
  }

  private updateContainer(isDraggedOver: boolean): void {
    this.container.classList.toggle("dragged-over", isDraggedOver)
  }

  override dispose(): void {
    super.dispose()

    this.disposeOverlay()
  }

  private disposeOverlay(): void {
    if (this.overlay) {
      this.overlay.dispose()
      this._overlay = undefined
    }
  }
}
