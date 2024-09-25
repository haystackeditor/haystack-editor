import { localize } from "vs/nls"
import { ITelemetryService } from "vs/platform/telemetry/common/telemetry"
import { KeyChord, KeyCode, KeyMod } from "vs/base/common/keyCodes"
import { IInstantiationService } from "vs/platform/instantiation/common/instantiation"
import { IContextMenuService } from "vs/platform/contextview/browser/contextView"
import { IThemeService } from "vs/platform/theme/common/themeService"
import { IStorageService } from "vs/platform/storage/common/storage"
import { IConfigurationService } from "vs/platform/configuration/common/configuration"
import { IWorkbenchLayoutService } from "vs/workbench/services/layout/browser/layoutService"
import { IExtensionService } from "vs/workbench/services/extensions/common/extensions"
import { IWorkspaceContextService } from "vs/platform/workspace/common/workspace"
import * as nls from "vs/nls"
import {
  Extensions,
  IViewContainersRegistry,
  IViewDescriptor,
  IViewDescriptorService,
  IViewsRegistry,
  ViewContainerLocation,
} from "vs/workbench/common/views"
import { ViewPaneContainer } from "vs/workbench/browser/parts/views/viewPaneContainer"
import { CANVAS_WORKSPACES_VIEWLET_ID } from "vs/workbench/contrib/haystack/common/haystack"
import { Registry } from "vs/platform/registry/common/platform"
import { SyncDescriptor } from "vs/platform/instantiation/common/descriptors"
import { IViewletViewOptions } from "vs/workbench/browser/parts/views/viewsViewlet"
import { ViewPane } from "vs/workbench/browser/parts/views/viewPane"
import { Codicon } from "vs/base/common/codicons"
import { registerIcon } from "vs/platform/theme/common/iconRegistry"
import { SavedCanvasWorkspacesView } from "vs/workbench/contrib/haystack/browser/workspace_view"

const canvasWorkspacesViewIcon = registerIcon(
  "canvas-workspaces-view-icon",
  Codicon.bookmark,
  localize("canvasWorkspacesIcon", "View icon of the canvas workspaces view"),
)

const viewsRegistry = Registry.as<IViewsRegistry>(Extensions.ViewsRegistry)

export class HaystackCanvasWorkspacesViewPaneContainer extends ViewPaneContainer {
  constructor(
    @IWorkbenchLayoutService layoutService: IWorkbenchLayoutService,
    @ITelemetryService telemetryService: ITelemetryService,
    @IInstantiationService instantiationService: IInstantiationService,
    @IContextMenuService contextMenuService: IContextMenuService,
    @IThemeService themeService: IThemeService,
    @IStorageService storageService: IStorageService,
    @IConfigurationService configurationService: IConfigurationService,
    @IExtensionService extensionService: IExtensionService,
    @IWorkspaceContextService contextService: IWorkspaceContextService,
    @IViewDescriptorService viewDescriptorService: IViewDescriptorService,
  ) {
    super(
      CANVAS_WORKSPACES_VIEWLET_ID,
      { mergeViewWithContainerWhenSingleView: true },
      instantiationService,
      configurationService,
      layoutService,
      contextMenuService,
      telemetryService,
      extensionService,
      themeService,
      storageService,
      contextService,
      viewDescriptorService,
    )

    this.registerViews()
  }

  private registerViews(): void {
    const canvasWorkspacesViewDescriptor =
      this.createCanvasWorkspacesViewDescriptor()
    const viewDescriptors = viewsRegistry.getViews(viewContainer)

    const viewDescriptorsToRegister: IViewDescriptor[] = []

    if (
      !viewDescriptors.some((v) => v.id === canvasWorkspacesViewDescriptor.id)
    ) {
      viewDescriptorsToRegister.push(canvasWorkspacesViewDescriptor)
    }

    viewsRegistry.registerViews(viewDescriptorsToRegister, viewContainer)
  }

  override create(parent: HTMLElement): void {
    super.create(parent)

    parent.classList.add("canvasWorkspaces")
  }

  override getOptimalWidth(): number {
    return 400
  }

  override getTitle(): string {
    return localize("canvas workspaces", "Canvas Workspaces")
  }

  protected override createView(
    viewDescriptor: IViewDescriptor,
    options: IViewletViewOptions,
  ): ViewPane {
    if (viewDescriptor.id === SavedCanvasWorkspacesView.ID) {
      return this.instantiationService.createInstance(
        SavedCanvasWorkspacesView,
        {
          ...options,
        },
      )
    }
    return super.createView(viewDescriptor, options)
  }

  private createCanvasWorkspacesViewDescriptor(): IViewDescriptor {
    return {
      id: SavedCanvasWorkspacesView.ID,
      name: SavedCanvasWorkspacesView.NAME,
      ctorDescriptor: new SyncDescriptor(SavedCanvasWorkspacesView),
      containerIcon: canvasWorkspacesViewIcon,
      order: 1,
      canToggleVisibility: false,
      canMoveView: false,
      collapsed: true,
      hideByDefault: false,
      focusCommand: {
        id: "workbench.haystack.action.focusCanvasWorkspacesView",
        keybindings: {
          primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyCode.KeyE),
        },
      },
    }
  }
}

const viewContainerRegistry = Registry.as<IViewContainersRegistry>(
  Extensions.ViewContainersRegistry,
)

const viewContainer = viewContainerRegistry.registerViewContainer(
  {
    id: CANVAS_WORKSPACES_VIEWLET_ID,
    title: nls.localize2("canvas workspaces", "Canvas Workspaces"),
    ctorDescriptor: new SyncDescriptor(
      HaystackCanvasWorkspacesViewPaneContainer,
    ),
    icon: canvasWorkspacesViewIcon,
    alwaysUseContainerInfo: true,
    order: 3,
    openCommandActionDescriptor: {
      id: CANVAS_WORKSPACES_VIEWLET_ID,
      mnemonicTitle: nls.localize(
        { key: "miCanvasWorkspaces", comment: ["&& denotes a mnemonic"] },
        "&&CanvasWorkspaces",
      ),
      keybindings: { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyC },
      order: 1,
    },
  },
  ViewContainerLocation.Sidebar,
  { isDefault: true },
)
