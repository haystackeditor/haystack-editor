/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize, localize2 } from "vs/nls"
import {
  GettingStartedInputSerializer,
  GettingStartedPage,
  inWelcomeContext,
} from "vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted"
import { Registry } from "vs/platform/registry/common/platform"
import {
  EditorExtensions,
  IEditorFactoryRegistry,
} from "vs/workbench/common/editor"
import {
  MenuId,
  registerAction2,
  Action2,
} from "vs/platform/actions/common/actions"
import { ServicesAccessor } from "vs/platform/instantiation/common/instantiation"
import {
  ContextKeyExpr,
  IContextKeyService,
  RawContextKey,
} from "vs/platform/contextkey/common/contextkey"
import { IEditorService } from "vs/workbench/services/editor/common/editorService"
import { KeybindingWeight } from "vs/platform/keybinding/common/keybindingsRegistry"
import { KeyCode } from "vs/base/common/keyCodes"
import {
  EditorPaneDescriptor,
  IEditorPaneRegistry,
} from "vs/workbench/browser/editor"
import { SyncDescriptor } from "vs/platform/instantiation/common/descriptors"
import { IWalkthroughsService } from "vs/workbench/contrib/welcomeGettingStarted/browser/gettingStartedService"
import { GettingStartedInput } from "vs/workbench/contrib/welcomeGettingStarted/browser/gettingStartedInput"
import {
  registerWorkbenchContribution2,
  WorkbenchPhase,
} from "vs/workbench/common/contributions"
import {
  ConfigurationScope,
  Extensions as ConfigurationExtensions,
  IConfigurationRegistry,
} from "vs/platform/configuration/common/configurationRegistry"
import { workbenchConfigurationNodeBase } from "vs/workbench/common/configuration"
import {
  CommandsRegistry,
  ICommandService,
} from "vs/platform/commands/common/commands"
import {
  IQuickInputService,
  IQuickPickItem,
} from "vs/platform/quickinput/common/quickInput"
import { IRemoteAgentService } from "vs/workbench/services/remote/common/remoteAgentService"
import {
  isLinux,
  isMacintosh,
  isWindows,
  OperatingSystem as OS,
} from "vs/base/common/platform"
import { IExtensionManagementServerService } from "vs/workbench/services/extensionManagement/common/extensionManagement"
import { IExtensionService } from "vs/workbench/services/extensions/common/extensions"
import {
  StartupPageEditorResolverContribution,
  StartupPageRunnerContribution,
} from "vs/workbench/contrib/welcomeGettingStarted/browser/startupPage"
import { Categories } from "vs/platform/action/common/actionCommonCategories"
import { IHaystackService } from "vs/workbench/services/haystack/common/haystackService"

export * as icons from "vs/workbench/contrib/welcomeGettingStarted/browser/gettingStartedIcons"

registerAction2(
  class extends Action2 {
    constructor() {
      super({
        id: "workbench.action.openWalkthrough",
        title: localize2("miWelcome", "Welcome"),
        category: Categories.Help,
        f1: true,
        menu: {
          id: MenuId.MenubarHelpMenu,
          group: "1_welcome",
          order: 1,
        },
        metadata: {
          description: localize2(
            "minWelcomeDescription",
            "Opens a Walkthrough to help you get started in VS Code."
          ),
        },
      })
    }

    public async run(
      accessor: ServicesAccessor,
      walkthroughID: string | { category: string; step: string } | undefined,
      toSide: boolean | undefined
    ) {
      const haystackService = accessor.get(IHaystackService)

      const modal = await haystackService.createModalEditor({
        resource: GettingStartedInput.RESOURCE,
      })

      if (walkthroughID) {
        const selectedCategory =
          typeof walkthroughID === "string"
            ? walkthroughID
            : walkthroughID.category
        const selectedStep =
          typeof walkthroughID === "string"
            ? undefined
            : walkthroughID.category + "#" + walkthroughID.step

        const input = modal?.input
        if (input != null && input instanceof GettingStartedInput) {
          input.selectedCategory = selectedCategory
          input.selectedStep = selectedStep
        }
      }
    }
  }
)

Registry.as<IEditorFactoryRegistry>(
  EditorExtensions.EditorFactory
).registerEditorSerializer(
  GettingStartedInput.ID,
  GettingStartedInputSerializer
)
Registry.as<IEditorPaneRegistry>(
  EditorExtensions.EditorPane
).registerEditorPane(
  EditorPaneDescriptor.create(
    GettingStartedPage,
    GettingStartedPage.ID,
    localize("welcome", "Welcome")
  ),
  [new SyncDescriptor(GettingStartedInput)]
)

const category = localize2("welcome", "Welcome")

registerAction2(
  class extends Action2 {
    constructor() {
      super({
        id: "welcome.goBack",
        title: localize2("welcome.goBack", "Go Back"),
        category,
        keybinding: {
          weight: KeybindingWeight.EditorContrib,
          primary: KeyCode.Escape,
          when: inWelcomeContext,
        },
        precondition: ContextKeyExpr.equals(
          "activeEditor",
          "gettingStartedPage"
        ),
        f1: true,
      })
    }

    run(accessor: ServicesAccessor) {
      const editorService = accessor.get(IEditorService)
      const editorPane = editorService.activeEditorPane
      if (editorPane instanceof GettingStartedPage) {
        editorPane.escape()
      }
    }
  }
)

CommandsRegistry.registerCommand({
  id: "walkthroughs.selectStep",
  handler: (accessor, stepID: string) => {
    const editorService = accessor.get(IEditorService)
    const editorPane = editorService.activeEditorPane
    if (editorPane instanceof GettingStartedPage) {
      editorPane.selectStepLoose(stepID)
    } else {
      console.error(
        "Cannot run walkthroughs.selectStep outside of walkthrough context"
      )
    }
  },
})

registerAction2(
  class extends Action2 {
    constructor() {
      super({
        id: "welcome.markStepComplete",
        title: localize("welcome.markStepComplete", "Mark Step Complete"),
        category,
      })
    }

    run(accessor: ServicesAccessor, arg: string) {
      if (!arg) {
        return
      }
      const gettingStartedService = accessor.get(IWalkthroughsService)
      gettingStartedService.progressStep(arg)
    }
  }
)

registerAction2(
  class extends Action2 {
    constructor() {
      super({
        id: "welcome.markStepIncomplete",
        title: localize("welcome.markStepInomplete", "Mark Step Incomplete"),
        category,
      })
    }

    run(accessor: ServicesAccessor, arg: string) {
      if (!arg) {
        return
      }
      const gettingStartedService = accessor.get(IWalkthroughsService)
      gettingStartedService.deprogressStep(arg)
    }
  }
)

registerAction2(
  class extends Action2 {
    constructor() {
      super({
        id: "welcome.showAllWalkthroughs",
        title: localize2("welcome.showAllWalkthroughs", "Open Walkthrough..."),
        category,
        f1: true,
      })
    }

    private async getQuickPickItems(
      contextService: IContextKeyService,
      gettingStartedService: IWalkthroughsService
    ): Promise<IQuickPickItem[]> {
      const categories = await gettingStartedService.getWalkthroughs()
      return categories
        .filter((c) => contextService.contextMatchesRules(c.when))
        .map((x) => ({
          id: x.id,
          label: x.title,
          detail: x.description,
          description: x.source,
        }))
    }

    async run(accessor: ServicesAccessor) {
      const commandService = accessor.get(ICommandService)
      const contextService = accessor.get(IContextKeyService)
      const quickInputService = accessor.get(IQuickInputService)
      const gettingStartedService = accessor.get(IWalkthroughsService)
      const extensionService = accessor.get(IExtensionService)

      const quickPick = quickInputService.createQuickPick()
      quickPick.canSelectMany = false
      quickPick.matchOnDescription = true
      quickPick.matchOnDetail = true
      quickPick.placeholder = localize(
        "pickWalkthroughs",
        "Select a walkthrough to open"
      )
      quickPick.items = await this.getQuickPickItems(
        contextService,
        gettingStartedService
      )
      quickPick.busy = true
      quickPick.onDidAccept(() => {
        const selection = quickPick.selectedItems[0]
        if (selection) {
          commandService.executeCommand(
            "workbench.action.openWalkthrough",
            selection.id
          )
        }
        quickPick.hide()
      })
      quickPick.onDidHide(() => quickPick.dispose())
      await extensionService.whenInstalledExtensionsRegistered()
      gettingStartedService.onDidAddWalkthrough(async () => {
        quickPick.items = await this.getQuickPickItems(
          contextService,
          gettingStartedService
        )
      })
      quickPick.show()
      quickPick.busy = false
    }
  }
)

export const WorkspacePlatform = new RawContextKey<
  "mac" | "linux" | "windows" | "webworker" | undefined
>(
  "workspacePlatform",
  undefined,
  localize(
    "workspacePlatform",
    "The platform of the current workspace, which in remote or serverless contexts may be different from the platform of the UI"
  )
)
class WorkspacePlatformContribution {
  static readonly ID = "workbench.contrib.workspacePlatform"

  constructor(
    @IExtensionManagementServerService
    private readonly extensionManagementServerService: IExtensionManagementServerService,
    @IRemoteAgentService
    private readonly remoteAgentService: IRemoteAgentService,
    @IContextKeyService private readonly contextService: IContextKeyService
  ) {
    this.remoteAgentService.getEnvironment().then((env) => {
      const remoteOS = env?.os

      const remotePlatform =
        remoteOS === OS.Macintosh
          ? "mac"
          : remoteOS === OS.Windows
          ? "windows"
          : remoteOS === OS.Linux
          ? "linux"
          : undefined

      if (remotePlatform) {
        WorkspacePlatform.bindTo(this.contextService).set(remotePlatform)
      } else if (
        this.extensionManagementServerService.localExtensionManagementServer
      ) {
        if (isMacintosh) {
          WorkspacePlatform.bindTo(this.contextService).set("mac")
        } else if (isLinux) {
          WorkspacePlatform.bindTo(this.contextService).set("linux")
        } else if (isWindows) {
          WorkspacePlatform.bindTo(this.contextService).set("windows")
        }
      } else if (
        this.extensionManagementServerService.webExtensionManagementServer
      ) {
        WorkspacePlatform.bindTo(this.contextService).set("webworker")
      } else {
        console.error("Error: Unable to detect workspace platform")
      }
    })
  }
}

const configurationRegistry = Registry.as<IConfigurationRegistry>(
  ConfigurationExtensions.Configuration
)
configurationRegistry.registerConfiguration({
  ...workbenchConfigurationNodeBase,
  properties: {
    "workbench.welcomePage.walkthroughs.openOnInstall": {
      scope: ConfigurationScope.MACHINE,
      type: "boolean",
      default: true,
      description: localize(
        "workbench.welcomePage.walkthroughs.openOnInstall",
        "When enabled, an extension's walkthrough will open upon install of the extension."
      ),
    },
    "workbench.startupEditor": {
      scope: ConfigurationScope.RESOURCE,
      type: "string",
      enum: [
        "none",
        "welcomePage",
        "readme",
        "newUntitledFile",
        "welcomePageInEmptyWorkbench",
        "terminal",
      ],
      enumDescriptions: [
        localize(
          {
            comment: [
              "This is the description for a setting. Values surrounded by single quotes are not to be translated.",
            ],
            key: "workbench.startupEditor.none",
          },
          "Start without an editor."
        ),
        localize(
          {
            comment: [
              "This is the description for a setting. Values surrounded by single quotes are not to be translated.",
            ],
            key: "workbench.startupEditor.welcomePage",
          },
          "Open the Welcome page, with content to aid in getting started with VS Code and extensions."
        ),
        localize(
          {
            comment: [
              "This is the description for a setting. Values surrounded by single quotes are not to be translated.",
            ],
            key: "workbench.startupEditor.readme",
          },
          "Open the README when opening a folder that contains one, fallback to 'welcomePage' otherwise. Note: This is only observed as a global configuration, it will be ignored if set in a workspace or folder configuration."
        ),
        localize(
          {
            comment: [
              "This is the description for a setting. Values surrounded by single quotes are not to be translated.",
            ],
            key: "workbench.startupEditor.newUntitledFile",
          },
          "Open a new untitled text file (only applies when opening an empty window)."
        ),
        localize(
          {
            comment: [
              "This is the description for a setting. Values surrounded by single quotes are not to be translated.",
            ],
            key: "workbench.startupEditor.welcomePageInEmptyWorkbench",
          },
          "Open the Welcome page when opening an empty workbench."
        ),
        localize(
          {
            comment: [
              "This is the description for a setting. Values surrounded by single quotes are not to be translated.",
            ],
            key: "workbench.startupEditor.terminal",
          },
          "Open a new terminal in the editor area."
        ),
      ],
      default: "welcomePage",
      description: localize(
        "workbench.startupEditor",
        "Controls which editor is shown at startup, if none are restored from the previous session."
      ),
    },
    "workbench.welcomePage.preferReducedMotion": {
      scope: ConfigurationScope.APPLICATION,
      type: "boolean",
      default: false,
      deprecationMessage: localize(
        "deprecationMessage",
        "Deprecated, use the global `workbench.reduceMotion`."
      ),
      description: localize(
        "workbench.welcomePage.preferReducedMotion",
        "When enabled, reduce motion in welcome page."
      ),
    },
  },
})

registerWorkbenchContribution2(
  WorkspacePlatformContribution.ID,
  WorkspacePlatformContribution,
  WorkbenchPhase.AfterRestored
)
registerWorkbenchContribution2(
  StartupPageEditorResolverContribution.ID,
  StartupPageEditorResolverContribution,
  WorkbenchPhase.BlockRestore
)
registerWorkbenchContribution2(
  StartupPageRunnerContribution.ID,
  StartupPageRunnerContribution,
  WorkbenchPhase.AfterRestored
)
