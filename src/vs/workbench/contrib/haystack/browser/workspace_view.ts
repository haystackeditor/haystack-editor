/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IConfigurationService } from "vs/platform/configuration/common/configuration"
import { IKeybindingService } from "vs/platform/keybinding/common/keybinding"
import { IInstantiationService } from "vs/platform/instantiation/common/instantiation"
import { IContextMenuService } from "vs/platform/contextview/browser/contextView"
import { IContextKeyService } from "vs/platform/contextkey/common/contextkey"
import { ViewPane } from "vs/workbench/browser/parts/views/viewPane"
import { IThemeService } from "vs/platform/theme/common/themeService"
import { IWorkbenchThemeService } from "vs/workbench/services/themes/common/workbenchThemeService"
import * as nls from "vs/nls"
import { ITelemetryService } from "vs/platform/telemetry/common/telemetry"
import { IViewDescriptorService } from "vs/workbench/common/views"
import { IOpenerService } from "vs/platform/opener/common/opener"
import { IHoverService } from "vs/platform/hover/browser/hover"
import { IViewletViewOptions } from "vs/workbench/browser/parts/views/viewsViewlet"
import { ILocalizedString } from "vs/nls"
import { renderCanvasWorkspacesView } from "vs/workbench/browser/haystack-frontend/root/canvas_workspaces"

export class SavedCanvasWorkspacesView extends ViewPane {
  static readonly ID = "workbench.haystack.savedCanvasWorkspacesView"
  static readonly NAME: ILocalizedString = nls.localize2(
    { key: "savedCanvasWorkspaces", comment: ["saved is an adjective"] },
    "Saved Canvas Workspaces"
  )

  constructor(
    options: IViewletViewOptions,
    @IInstantiationService instantiationService: IInstantiationService,
    @IContextMenuService contextMenuService: IContextMenuService,
    @IViewDescriptorService viewDescriptorService: IViewDescriptorService,
    @IKeybindingService keybindingService: IKeybindingService,
    @IContextKeyService contextKeyService: IContextKeyService,
    @IConfigurationService configurationService: IConfigurationService,
    @IThemeService themeService: IWorkbenchThemeService,
    @ITelemetryService telemetryService: ITelemetryService,
    @IHoverService hoverService: IHoverService,
    @IOpenerService openerService: IOpenerService
  ) {
    super(
      options,
      keybindingService,
      contextMenuService,
      configurationService,
      contextKeyService,
      viewDescriptorService,
      instantiationService,
      openerService,
      themeService,
      telemetryService,
      hoverService
    )
  }

  protected override renderBody(container: HTMLElement): void {
    super.renderBody(container)

    renderCanvasWorkspacesView(container)
  }
}
