/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ServicesAccessor } from "vs/editor/browser/editorExtensions"
import { localize, localize2 } from "vs/nls"
import { Categories } from "vs/platform/action/common/actionCommonCategories"
import { Action2, MenuId } from "vs/platform/actions/common/actions"
import { IConfigurationService } from "vs/platform/configuration/common/configuration"
import { ContextKeyExpr } from "vs/platform/contextkey/common/contextkey"
import { IHaystackService } from "vs/workbench/services/haystack/common/haystackService"
import { INotificationService } from "vs/platform/notification/common/notification"
import { IExtensionsWorkbenchService } from "vs/workbench/contrib/extensions/common/extensions"
import { IUserKeybindingItem } from "vs/workbench/services/keybinding/common/keybindingIO"
import { KeybindingParser } from "vs/base/common/keybindingParser"
import { ITextFileService } from "vs/workbench/services/textfile/common/textfiles"
import { IPathService } from "vs/workbench/services/path/common/pathService"
import { URI } from "vs/base/common/uri"
import { IUserDataProfileService } from "vs/workbench/services/userDataProfile/common/userDataProfile"
import { CancellationToken } from "vs/base/common/cancellation"
import {
  EXTENSION_INSTALL_SOURCE_CONTEXT,
  ExtensionInstallSource,
  IExtensionGalleryService,
  IExtensionManagementService,
} from "vs/platform/extensionManagement/common/extensionManagement"
import {
  IProgressService,
  ProgressLocation,
} from "vs/platform/progress/common/progress"
import {
  COPILOT_OPT_IN,
  IMPORT_VSCODE_SETTINGS_ID,
} from "vs/editor/contrib/haystack/haystackCommon"
import { timeout } from "vs/base/common/async"
import { KeybindingWeight } from "vs/platform/keybinding/common/keybindingsRegistry"
import { KeyChord, KeyCode, KeyMod } from "vs/base/common/keyCodes"

const removeCanvasDotsCommandId = "editor.haystackEditor.removeCanvasDots"
const addCanvasDotsCommandId = "editor.haystackEditor.addCanvasDots"

export class CopilotOptOut extends Action2 {
  constructor() {
    super({
      id: "editor.action.optOutCopilot",
      title: {
        ...localize2("optOutCopilot", "Opt out of navigational copilot"),
        mnemonicTitle: localize(
          { key: "mioptOutCopilot", comment: ["&& denotes a mnemonic"] },
          "&&Opt out of navigational copilot",
        ),
      },
      metadata: {
        description: localize2(
          "optOutCopilot.description",
          "Opts out of Haystack's navigational copilot",
        ),
      },
      category: Categories.Haystack,
      precondition: ContextKeyExpr.equals(
        "config.editor.haystackEditor.copilotOptOut",
        false,
      ),
      menu: [
        { id: MenuId.CommandPalette },
        { id: MenuId.MenubarAppearanceMenu, group: "4_editor", order: 3 },
        { id: MenuId.HaystackContext },
      ],
    })
  }

  override async run(accessor: ServicesAccessor): Promise<void> {
    const configurationService = accessor.get(IConfigurationService)
    return configurationService.updateValue(
      "editor.haystackEditor.copilotOptOut",
      true,
    )
  }
}

export class CopilotOptIn extends Action2 {
  constructor() {
    super({
      id: COPILOT_OPT_IN,
      title: {
        ...localize2("optInCopilot", "Opt into navigational copilot"),
        mnemonicTitle: localize(
          { key: "mioptInCopilot", comment: ["&& denotes a mnemonic"] },
          "&&Opt into navigational copilot",
        ),
      },
      metadata: {
        description: localize2(
          "optInCopilot.description",
          "Opts into Haystack's navigational copilot",
        ),
      },
      category: Categories.Haystack,
      precondition: ContextKeyExpr.equals(
        "config.editor.haystackEditor.copilotOptOut",
        true,
      ),
      menu: [
        { id: MenuId.CommandPalette },
        { id: MenuId.MenubarAppearanceMenu, group: "4_editor", order: 3 },
        { id: MenuId.HaystackContext },
      ],
    })
  }

  override async run(accessor: ServicesAccessor): Promise<void> {
    const configurationService = accessor.get(IConfigurationService)
    return configurationService.updateValue(
      "editor.haystackEditor.copilotOptOut",
      false,
    )
  }
}

export class ResetZoomLevel extends Action2 {
  constructor() {
    super({
      id: "editor.action.resetZoomLevel",
      title: {
        ...localize2("resetZoomLevel", "Reset canvas zoom level"),
        mnemonicTitle: localize(
          { key: "miresetZoomLevel", comment: ["&& denotes a mnemonic"] },
          "&&Resets the canvas zoom level",
        ),
      },
      metadata: {
        description: localize2(
          "resetZoomLevel.description",
          "Resets the canvas zoom level to the default",
        ),
      },
      category: Categories.Haystack,
      menu: [
        { id: MenuId.CommandPalette },
        { id: MenuId.MenubarAppearanceMenu, group: "4_editor", order: 3 },
        { id: MenuId.HaystackContext },
      ],
    })
  }

  override async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.resetZoomLevel()
  }
}

export class HideCanvasDots extends Action2 {
  constructor() {
    super({
      id: removeCanvasDotsCommandId,
      title: "Hide canvas dots",
      category: Categories.Haystack,
      precondition: ContextKeyExpr.equals(
        "config.editor.haystackEditor.hideCanvasDots",
        false,
      ),
      menu: [
        { id: MenuId.CommandPalette },
        { id: MenuId.MenubarAppearanceMenu, group: "4_editor", order: 3 },
        { id: MenuId.HaystackContext },
      ],
    })
  }

  public run(accessor: ServicesAccessor): void {
    const haystackService = accessor.get(IHaystackService)
    haystackService?.removeCanvasDots()

    const configurationService = accessor.get(IConfigurationService)
    configurationService.updateValue(
      "editor.haystackEditor.hideCanvasDots",
      true,
    )
  }
}

export class ShowCanvasDots extends Action2 {
  constructor() {
    super({
      id: addCanvasDotsCommandId,
      title: "Show canvas dots",
      category: Categories.Haystack,
      precondition: ContextKeyExpr.equals(
        "config.editor.haystackEditor.hideCanvasDots",
        true,
      ),
      menu: [
        { id: MenuId.CommandPalette },
        { id: MenuId.MenubarAppearanceMenu, group: "4_editor", order: 3 },
        { id: MenuId.HaystackContext },
      ],
    })
  }

  public run(accessor: ServicesAccessor): void {
    const haystackService = accessor.get(IHaystackService)
    haystackService?.addCanvasDots()

    const configurationService = accessor.get(IConfigurationService)
    configurationService.updateValue(
      "editor.haystackEditor.hideCanvasDots",
      false,
    )
  }
}

interface ExtensionMetadata {
  identifier: {
    id: string
    uuid: string
  }
  version: string
  metadata?: {
    targetPlatform?: string
  }
}

export class ImportSettingsAction extends Action2 {
  constructor() {
    super({
      id: IMPORT_VSCODE_SETTINGS_ID,
      title: localize(
        "importSettings.label",
        "Import VS Code Settings and Extensions",
      ),
      category: Categories.Settings,
      menu: [
        { id: MenuId.CommandPalette },
        { id: MenuId.MenubarAppearanceMenu, group: "4_editor", order: 3 },
        { id: MenuId.HaystackContext },
      ],
    })
  }

  public run(accessor: ServicesAccessor): void {
    const notificationsService = accessor.get(INotificationService)
    const textFileService = accessor.get(ITextFileService)
    const pathService = accessor.get(IPathService)
    const extensionsService = accessor.get(IExtensionsWorkbenchService)
    const userDataProfileService = accessor.get(IUserDataProfileService)
    const extensionGalleryService = accessor.get(IExtensionGalleryService)
    const extensionManagementService = accessor.get(IExtensionManagementService)
    const progressService = accessor.get(IProgressService)

    progressService.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "Importing VS Code settings",
      },
      async () => {
        return await this.importSettings(
          notificationsService,
          textFileService,
          pathService,
          extensionsService,
          userDataProfileService,
          extensionGalleryService,
          extensionManagementService,
        )
      },
    )
  }

  private async importSettings(
    notificationsService: INotificationService,
    textFileService: ITextFileService,
    pathService: IPathService,
    extensionsService: IExtensionsWorkbenchService,
    userDataProfileService: IUserDataProfileService,
    extensionGalleryService: IExtensionGalleryService,
    extensionManagementService: IExtensionManagementService,
  ): Promise<void> {
    try {
      const homeUri = await pathService.userHome()

      if (!homeUri) {
        throw new Error("Unable to determine home directory")
      }

      const haystackKeybindingsUri =
        userDataProfileService.currentProfile.keybindingsResource
      const haystackPath = haystackKeybindingsUri.path
      const haystackPathList = haystackPath.split("/")
      // Gets to the base directory.
      haystackPathList.pop()
      haystackPathList.pop()
      haystackPathList.pop()
      const basePath = haystackPathList.join("/")
      const baseUri = URI.file(basePath)

      const vscodeSettingsUri = URI.joinPath(baseUri, "Code/User/settings.json")

      try {
        const settingsContent = await textFileService.read(vscodeSettingsUri)
        const settingsJson = settingsContent.value
        await textFileService.write(
          userDataProfileService.currentProfile.settingsResource,
          settingsJson,
        )
      } catch (e) {}

      const vscodeKeybindingsUri = URI.joinPath(
        URI.file(basePath),
        "Code/User/keybindings.json",
      )

      try {
        const keybindingsContent =
          await textFileService.read(vscodeKeybindingsUri)
        const keybindingsJson = keybindingsContent.value
        await textFileService.write(
          userDataProfileService.currentProfile.keybindingsResource,
          keybindingsJson,
        )
      } catch (e) {}

      // Import extensions
      const vscodeDir = URI.joinPath(homeUri, ".vscode")

      // Import keybindings
      const extensionsPath = URI.joinPath(
        vscodeDir,
        "extensions/extensions.json",
      )
      const extensionsContent = await textFileService.read(extensionsPath)

      const extensions = JSON.parse(
        extensionsContent.value,
      ) as ExtensionMetadata[]

      const failedExtensions: string[] = []
      const extensionPromises: Promise<void>[] = []

      for (const extensionIdentifier of extensions) {
        const {
          identifier: { id },
          version,
          metadata,
        } = extensionIdentifier

        if (metadata?.targetPlatform === "undefined") {
          metadata.targetPlatform = undefined
        }

        extensionPromises.push(
          this.installExtension(
            basePath,
            vscodeDir,
            id,
            version,
            metadata?.targetPlatform ?? undefined,
            extensionsService,
            extensionGalleryService,
            extensionManagementService,
            textFileService,
            failedExtensions,
          ),
        )
      }

      await Promise.all(extensionPromises)

      notificationsService.info(
        "Finished importing VS Code settings and extensions!",
      )
      if (failedExtensions.length > 0) {
        notificationsService.error(
          `Failed to import ${
            failedExtensions.length
          } extensions. Consider downloading the following extension from the VS Code store and importing them manually: ${failedExtensions.join(
            ", ",
          )}`,
        )
      }
    } catch (error) {
      notificationsService.error("Failed to import VS Code settings")
    }
  }

  public static readUserKeybindingItem(input: Object): IUserKeybindingItem {
    const keybinding =
      "key" in input && typeof input.key === "string"
        ? KeybindingParser.parseKeybinding(input.key)
        : null
    const when =
      "when" in input && typeof input.when === "string"
        ? ContextKeyExpr.deserialize(input.when)
        : undefined
    const command =
      "command" in input && typeof input.command === "string"
        ? input.command
        : null
    const commandArgs =
      "args" in input && typeof input.args !== "undefined"
        ? input.args
        : undefined
    return {
      keybinding,
      command,
      commandArgs,
      when,
      _sourceKey:
        "key" in input && typeof input.key === "string" ? input.key : undefined,
    }
  }

  private async installExtension(
    vsCodeBasePath: string,
    vsCodeDir: URI,
    id: string,
    version: string,
    targetPlatform: string | undefined,
    extensionsService: IExtensionsWorkbenchService,
    extensionGalleryService: IExtensionGalleryService,
    extensionManagementService: IExtensionManagementService,
    textFileService: ITextFileService,
    failedExtensions: string[],
  ): Promise<void> {
    // Try to grab the VSIX from the cache as a fallback.
    const extensionPath =
      targetPlatform != null
        ? `${id}-${version}-${targetPlatform}`
        : `${id}-${version}`
    const path = `Code/CachedExtensionVSIXs/${extensionPath}`

    try {
      try {
        const [gallery] = await extensionGalleryService.getExtensions(
          [{ id }],
          CancellationToken.None,
        )
        if (!gallery) {
          throw new Error("failed to install extension")
        }
        await Promise.race([
          await extensionManagementService.installFromGallery(gallery, {
            isMachineScoped: true,
            installPreReleaseVersion: false,
            context: {
              [EXTENSION_INSTALL_SOURCE_CONTEXT]:
                ExtensionInstallSource.COMMAND,
            },
          }),
          timeout(20000).then(() => {
            throw new Error("Failed to download extension in 10 seconds")
          }),
        ])
      } catch (e) {
        await Promise.race([
          extensionsService.install(
            id,
            {
              installPreReleaseVersion: false,
              context: {
                [EXTENSION_INSTALL_SOURCE_CONTEXT]:
                  ExtensionInstallSource.COMMAND,
              },
              enable: true,
              isMachineScoped: true,
            },
            ProgressLocation.Notification,
          ),
          timeout(20000).then(() => {
            throw new Error("Failed to download extension in 10 seconds")
          }),
        ])
      }
    } catch (e) {
      try {
        const vsixUri = URI.joinPath(URI.file(vsCodeBasePath), path)
        await Promise.race([
          await extensionsService.install(
            vsixUri,
            undefined,
            ProgressLocation.Notification,
          ),
          timeout(20000).then(() => {
            throw new Error("Failed to download extension in 10 seconds")
          }),
        ])
      } catch (e) {
        // Tries to grab the extension name.
        let extensionName: string | undefined = undefined

        try {
          const extensionUri = URI.joinPath(
            vsCodeDir,
            `extensions/${extensionPath}/package.json`,
          )
          const result = await textFileService.read(extensionUri)
          const metadata = JSON.parse(result.value)
          extensionName = metadata.displayName
        } catch (e) {}
        failedExtensions.push(extensionName ?? id)
      }
    }
  }
}

export class EditAiApiKeys extends Action2 {
  static readonly ID = "workbench.action.editAiApiKeys"

  constructor() {
    super({
      id: EditAiApiKeys.ID,
      title: localize2("editAiApiKeys", "Edit Copilot API key settings"),
      menu: [
        { id: MenuId.MenubarSettingsMenu },
        { id: MenuId.CommandPalette },
        { id: MenuId.HaystackContext },
      ],
    })
  }

  async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.createCopilotSettingsEditor()
  }
}

export class HaystackKeybindingsAction extends Action2 {
  static readonly ID = "workbench.action.haystackKeybindings"

  constructor() {
    super({
      id: HaystackKeybindingsAction.ID,
      title: localize2("haystackKeybindings", "See Haystack key bindings"),
      menu: [
        { id: MenuId.MenubarSettingsMenu },
        { id: MenuId.CommandPalette },
        { id: MenuId.HaystackContext },
      ],
    })
  }

  async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.createHaystackKeybindingsEditor()
  }
}

export class FocusOnEditorContainerAction extends Action2 {
  static readonly ID = "workbench.action.focusOnEditorContainer"

  constructor() {
    super({
      id: FocusOnEditorContainerAction.ID,
      title: localize2("focusOnEditorContainer", "Focus on editor container"),
      menu: [
        { id: MenuId.MenubarSettingsMenu },
        { id: MenuId.CommandPalette },
        { id: MenuId.HaystackContext },
      ],
      keybinding: {
        weight: KeybindingWeight.WorkbenchContrib,
        primary: KeyMod.CtrlCmd | KeyCode.Escape,
      },
    })
  }

  async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.focusOnEditorContainer()
  }
}

export class FocusOnCanvasAction extends Action2 {
  static readonly ID = "workbench.action.focusOnCanvas"

  constructor() {
    super({
      id: FocusOnCanvasAction.ID,
      title: localize2("focusOnCanvas", "Focus on canvas"),
      menu: [
        { id: MenuId.MenubarSettingsMenu },
        { id: MenuId.CommandPalette },
        { id: MenuId.HaystackContext },
      ],
      keybinding: {
        weight: KeybindingWeight.WorkbenchContrib,
        primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Escape,
      },
    })
  }

  async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.focusOnCanvas()
  }
}

export class GoBackInSelectionAction extends Action2 {
  static readonly ID = "editor.action.goBackInSelection"

  constructor() {
    super({
      id: GoBackInSelectionAction.ID,
      title: localize2("goBackInSelection", "Go back in selection"),
      menu: [
        { id: MenuId.MenubarSettingsMenu },
        { id: MenuId.CommandPalette },
        { id: MenuId.HaystackContext },
      ],
      keybinding: {
        weight: KeybindingWeight.WorkbenchContrib,
        win: { primary: KeyMod.WinCtrl | KeyMod.Shift | KeyCode.LeftArrow },
        mac: { primary: KeyMod.WinCtrl | KeyCode.Equal },
        linux: {
          primary: KeyMod.WinCtrl | KeyMod.Shift | KeyCode.LeftArrow,
        },
      },
    })
  }

  async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.goBackInSelection()
  }
}

export class GoForwardInSelectionAction extends Action2 {
  static readonly ID = "editor.action.goForwardInSelection"

  constructor() {
    super({
      id: GoForwardInSelectionAction.ID,
      title: localize2("goForwardInSelection", "Go forward in selection"),
      menu: [
        { id: MenuId.MenubarSettingsMenu },
        { id: MenuId.CommandPalette },
        { id: MenuId.HaystackContext },
      ],
      keybinding: {
        weight: KeybindingWeight.WorkbenchContrib,
        win: { primary: KeyMod.WinCtrl | KeyMod.Shift | KeyCode.RightArrow },
        mac: { primary: KeyMod.WinCtrl | KeyMod.Shift | KeyCode.Equal },
        linux: {
          primary: KeyMod.WinCtrl | KeyMod.Shift | KeyCode.RightArrow,
        },
      },
    })
  }

  async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.goForwardInSelection()
  }
}

export class GoDownOneLevelAction extends Action2 {
  static readonly ID = "editor.action.goDownOneLevel"

  constructor() {
    super({
      id: GoDownOneLevelAction.ID,
      title: localize2("goDownOneLevel", "Go down one level"),
      menu: [
        { id: MenuId.MenubarSettingsMenu },
        { id: MenuId.CommandPalette },
        { id: MenuId.HaystackContext },
      ],
      keybinding: {
        weight: KeybindingWeight.WorkbenchContrib,
        primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyCode.DownArrow),
      },
    })
  }

  async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.goDownOneLevelInEditor()
  }
}

export class GoUpOneLevelAction extends Action2 {
  static readonly ID = "editor.action.goUpOneLevel"

  constructor() {
    super({
      id: GoUpOneLevelAction.ID,
      title: localize2("goUpOneLevel", "Go up one level"),
      menu: [
        { id: MenuId.MenubarSettingsMenu },
        { id: MenuId.CommandPalette },
        { id: MenuId.HaystackContext },
      ],
      keybinding: {
        weight: KeybindingWeight.WorkbenchContrib,
        primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyCode.UpArrow),
      },
    })
  }

  async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.goUpOneLevelInEditor()
  }
}

export class GoToFileAction extends Action2 {
  static readonly ID = "editor.action.goToFile"

  constructor() {
    super({
      id: GoToFileAction.ID,
      title: localize2("goToFile", "Go to file"),
      menu: [
        { id: MenuId.MenubarSettingsMenu },
        { id: MenuId.CommandPalette },
        { id: MenuId.HaystackContext },
      ],
      keybinding: {
        weight: KeybindingWeight.WorkbenchContrib,
        primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyCode.KeyF),
      },
    })
  }

  async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.goToFile()
  }
}

export class GoToDeepestSymbolAction extends Action2 {
  static readonly ID = "editor.action.goToDeepestSymbol"

  constructor() {
    super({
      id: GoToDeepestSymbolAction.ID,
      title: localize2("goToDeepestSymbol", "Go to deepest symbol"),
      menu: [
        { id: MenuId.MenubarSettingsMenu },
        { id: MenuId.CommandPalette },
        { id: MenuId.HaystackContext },
      ],
      keybinding: {
        weight: KeybindingWeight.WorkbenchContrib,
        primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyCode.KeyD),
      },
    })
  }

  async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.goToDeepestSymbol()
  }
}

export class ViewIncomingDependenciesAction extends Action2 {
  static readonly ID = "editor.action.viewIncomingDependencies"

  constructor() {
    super({
      id: ViewIncomingDependenciesAction.ID,
      title: localize2(
        "viewIncomingDependencies",
        "View incoming dependencies",
      ),
      menu: [{ id: MenuId.HaystackContext }],
      keybinding: {
        weight: KeybindingWeight.WorkbenchContrib,
        primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyCode.KeyI),
      },
    })
  }

  async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.viewIncomingDependencies()
  }
}

export class ViewOutgoingDependenciesAction extends Action2 {
  static readonly ID = "editor.action.viewOutgoingDependencies"

  constructor() {
    super({
      id: ViewOutgoingDependenciesAction.ID,

      title: localize2(
        "viewOutgoingDependencies",
        "View outgoing dependencies",
      ),
      menu: [{ id: MenuId.HaystackContext }],
      keybinding: {
        weight: KeybindingWeight.WorkbenchContrib,
        primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KeyK, KeyCode.KeyO),
      },
    })
  }

  async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.viewOutgoingDependencies()
  }
}

export class PinCurrentEditorAction extends Action2 {
  static readonly ID = "editor.action.pinCurrentEditor"

  constructor() {
    super({
      id: PinCurrentEditorAction.ID,

      title: localize2("pinCurrentEditor", "Pin current editor"),
      menu: [{ id: MenuId.HaystackContext }, { id: MenuId.CommandPalette }],
      keybinding: {
        weight: KeybindingWeight.WorkbenchContrib,
        primary: KeyMod.Alt | KeyCode.Enter,
      },
    })
  }

  async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.pinCurrentEditor()
  }
}

export class UnpinCurrentEditorAction extends Action2 {
  static readonly ID = "editor.action.unpinCurrentEditor"

  constructor() {
    super({
      id: UnpinCurrentEditorAction.ID,

      title: localize2("unpinCurrentEditor", "Unpin current editor"),
      menu: [{ id: MenuId.HaystackContext }, { id: MenuId.CommandPalette }],
      keybinding: {
        weight: KeybindingWeight.WorkbenchContrib,
      },
    })
  }

  async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.unpinCurrentEditor()
  }
}

export class ShowNavigationBar extends Action2 {
  static readonly ID = "editor.action.showNavigationBar"

  constructor() {
    super({
      id: ShowNavigationBar.ID,
      precondition: ContextKeyExpr.equals(
        "config.editor.haystackEditor.showNavigationBar",
        false,
      ),
      title: localize2("showNavigationBar", "Show Navigation Bar"),
      menu: [{ id: MenuId.HaystackContext }, { id: MenuId.CommandPalette }],
      keybinding: {
        weight: KeybindingWeight.WorkbenchContrib,
      },
    })
  }

  override async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.setShowNavigationBar(true)

    const configurationService = accessor.get(IConfigurationService)
    return configurationService.updateValue(
      "editor.haystackEditor.showNavigationBar",
      true,
    )
  }
}

export class HideNavigationBar extends Action2 {
  static readonly ID = "editor.action.hideNavigationBar"

  constructor() {
    super({
      id: HideNavigationBar.ID,
      precondition: ContextKeyExpr.equals(
        "config.editor.haystackEditor.showNavigationBar",
        true,
      ),
      title: localize2("showNavigationBar", "Hide Navigation Bar"),
      menu: [{ id: MenuId.HaystackContext }, { id: MenuId.CommandPalette }],
      keybinding: {
        weight: KeybindingWeight.WorkbenchContrib,
      },
    })
  }

  override async run(accessor: ServicesAccessor): Promise<void> {
    const haystackService = accessor.get(IHaystackService)
    haystackService.setShowNavigationBar(false)

    const configurationService = accessor.get(IConfigurationService)
    return configurationService.updateValue(
      "editor.haystackEditor.showNavigationBar",
      false,
    )
  }
}
