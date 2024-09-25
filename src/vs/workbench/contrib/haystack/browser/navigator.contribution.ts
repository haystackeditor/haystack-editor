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
import { NAVIGATOR_VIEWLET_ID } from "vs/workbench/contrib/haystack/common/haystack"
import { Registry } from "vs/platform/registry/common/platform"
import { SyncDescriptor } from "vs/platform/instantiation/common/descriptors"
import { IViewletViewOptions } from "vs/workbench/browser/parts/views/viewsViewlet"
import { ViewPane } from "vs/workbench/browser/parts/views/viewPane"
import { NavigatorOpenEditorsView } from "vs/workbench/contrib/haystack/browser/navigator_view"
import { Codicon } from "vs/base/common/codicons"
import { registerIcon } from "vs/platform/theme/common/iconRegistry"

const openEditorsViewIcon = registerIcon(
  "open-editors-view-icon",
  Codicon.book,
  localize("openEditorsIcon", "View icon of the open editors view."),
)

const viewsRegistry = Registry.as<IViewsRegistry>(Extensions.ViewsRegistry)

export class HaystackNavigatorViewPaneContainer extends ViewPaneContainer {
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
      NAVIGATOR_VIEWLET_ID,
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
    const openEditorsViewDescriptor = this.createOpenEditorsViewDescriptor()
    const viewDescriptors = viewsRegistry.getViews(viewContainer)

    const viewDescriptorsToRegister: IViewDescriptor[] = []

    if (!viewDescriptors.some((v) => v.id === openEditorsViewDescriptor.id)) {
      viewDescriptorsToRegister.push(openEditorsViewDescriptor)
    }

    viewsRegistry.registerViews(viewDescriptorsToRegister, viewContainer)
  }

  override create(parent: HTMLElement): void {
    super.create(parent)

    parent.classList.add("navigator")
  }

  override getOptimalWidth(): number {
    return 400
  }

  override getTitle(): string {
    return localize("navigator", "Navigator")
  }

  protected override createView(
    viewDescriptor: IViewDescriptor,
    options: IViewletViewOptions,
  ): ViewPane {
    if (viewDescriptor.id === NavigatorOpenEditorsView.ID) {
      return this.instantiationService.createInstance(
        NavigatorOpenEditorsView,
        {
          ...options,
        },
      )
    }
    return super.createView(viewDescriptor, options)
  }

  private createOpenEditorsViewDescriptor(): IViewDescriptor {
    return {
      id: NavigatorOpenEditorsView.ID,
      name: NavigatorOpenEditorsView.NAME,
      ctorDescriptor: new SyncDescriptor(NavigatorOpenEditorsView),
      containerIcon: openEditorsViewIcon,
      order: 2,
      canToggleVisibility: false,
      canMoveView: false,
      collapsed: true,
      hideByDefault: false,
      focusCommand: {
        id: "workbench.haystack.action.focusOpenEditorsView",
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
    id: NAVIGATOR_VIEWLET_ID,
    title: nls.localize2("navigate editors", "Navigate Editors"),
    ctorDescriptor: new SyncDescriptor(HaystackNavigatorViewPaneContainer),
    icon: openEditorsViewIcon,
    alwaysUseContainerInfo: true,
    order: 2,
    openCommandActionDescriptor: {
      id: NAVIGATOR_VIEWLET_ID,
      mnemonicTitle: nls.localize(
        { key: "miNavigateEditors", comment: ["&& denotes a mnemonic"] },
        "&&NavigateEditors",
      ),
      keybindings: { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyK },
      order: 1,
    },
  },
  ViewContainerLocation.Sidebar,
  { isDefault: true },
)
