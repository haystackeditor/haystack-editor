/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IViewletViewOptions } from 'vs/workbench/browser/parts/views/viewsViewlet';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService, RawContextKey, IContextKey, ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { localize, localize2 } from 'vs/nls';
import { IDebugService, CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_EXTENSION_AVAILABLE } from 'vs/workbench/contrib/debug/common/debug';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { ViewPane } from 'vs/workbench/browser/parts/views/viewPane';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IViewDescriptorService, IViewsRegistry, Extensions, ViewContentGroups } from 'vs/workbench/common/views';
import { Registry } from 'vs/platform/registry/common/platform';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { WorkbenchStateContext } from 'vs/workbench/common/contextkeys';
import { OpenFolderAction, OpenFileAction, OpenFileFolderAction } from 'vs/workbench/browser/actions/workspaceActions';
import { isMacintosh, isWeb } from 'vs/base/common/platform';
import { isCodeEditor, isDiffEditor } from 'vs/editor/browser/editorBrowser';
import { IStorageService, StorageScope, StorageTarget } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { DisposableStore } from 'vs/base/common/lifecycle';
import { SELECT_AND_START_ID, DEBUG_CONFIGURE_COMMAND_ID, DEBUG_START_COMMAND_ID } from 'vs/workbench/contrib/debug/browser/debugCommands';
import { ILocalizedString } from 'vs/platform/action/common/action';
import { IHoverService } from 'vs/platform/hover/browser/hover';

const debugStartLanguageKey = 'debugStartLanguage';
const CONTEXT_DEBUG_START_LANGUAGE = new RawContextKey<string>(debugStartLanguageKey, undefined);
const CONTEXT_DEBUGGER_INTERESTED_IN_ACTIVE_EDITOR = new RawContextKey<boolean>('debuggerInterestedInActiveEditor', false);

export class WelcomeView extends ViewPane {

	static readonly ID = 'workbench.debug.welcome';
	static readonly LABEL: ILocalizedString = localize2('run', "Run");

	private debugStartLanguageContext: IContextKey<string | undefined>;
	private debuggerInterestedContext: IContextKey<boolean>;

	constructor(
		options: IViewletViewOptions,
		@IThemeService themeService: IThemeService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IDebugService private readonly debugService: IDebugService,
		@IEditorService private readonly editorService: IEditorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IOpenerService openerService: IOpenerService,
		@IStorageService storageSevice: IStorageService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IHoverService hoverService: IHoverService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService, hoverService);

		this.debugStartLanguageContext = CONTEXT_DEBUG_START_LANGUAGE.bindTo(contextKeyService);
		this.debuggerInterestedContext = CONTEXT_DEBUGGER_INTERESTED_IN_ACTIVE_EDITOR.bindTo(contextKeyService);
		const lastSetLanguage = storageSevice.get(debugStartLanguageKey, StorageScope.WORKSPACE);
		this.debugStartLanguageContext.set(lastSetLanguage);

		const setContextKey = () => {
			let editorControl = this.editorService.activeTextEditorControl;
			if (isDiffEditor(editorControl)) {
				editorControl = editorControl.getModifiedEditor();
			}

			if (isCodeEditor(editorControl)) {
				const model = editorControl.getModel();
				const language = model ? model.getLanguageId() : undefined;
				if (language && this.debugService.getAdapterManager().someDebuggerInterestedInLanguage(language)) {
					this.debugStartLanguageContext.set(language);
					this.debuggerInterestedContext.set(true);
					storageSevice.store(debugStartLanguageKey, language, StorageScope.WORKSPACE, StorageTarget.MACHINE);
					return;
				}
			}
			this.debuggerInterestedContext.set(false);
		};

		const disposables = new DisposableStore();
		this._register(disposables);

		this._register(editorService.onDidActiveEditorChange(() => {
			disposables.clear();

			let editorControl = this.editorService.activeTextEditorControl;
			if (isDiffEditor(editorControl)) {
				editorControl = editorControl.getModifiedEditor();
			}

			if (isCodeEditor(editorControl)) {
				disposables.add(editorControl.onDidChangeModelLanguage(setContextKey));
			}

			setContextKey();
		}));
		this._register(this.debugService.getAdapterManager().onDidRegisterDebugger(setContextKey));
		this._register(this.onDidChangeBodyVisibility(visible => {
			if (visible) {
				setContextKey();
			}
		}));
		setContextKey();

		const debugKeybinding = this.keybindingService.lookupKeybinding(DEBUG_START_COMMAND_ID);
		debugKeybindingLabel = debugKeybinding ? ` (${debugKeybinding.getLabel()})` : '';
	}

	override shouldShowWelcome(): boolean {
		return true;
	}
}

const viewsRegistry = Registry.as<IViewsRegistry>(Extensions.ViewsRegistry);
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
	content: localize(
		{
			key: 'openAFileWhichCanBeDebugged',
			comment: [
				'Please do not translate the word "command", it is part of our internal syntax which must not change',
				'{Locked="](command:{0})"}'
			]
		},
		"[Open a file](command:{0}) which can be debugged or run.", (isMacintosh && !isWeb) ? OpenFileFolderAction.ID : OpenFileAction.ID
	),
	when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUGGER_INTERESTED_IN_ACTIVE_EDITOR.toNegated()),
	group: ViewContentGroups.Open,
});

let debugKeybindingLabel = '';
viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
	content: `[${localize('runAndDebugAction', "Run and Debug")}${debugKeybindingLabel}](command:${DEBUG_START_COMMAND_ID})`,
	when: CONTEXT_DEBUGGERS_AVAILABLE,
	group: ViewContentGroups.Debug,
	// Allow inserting more buttons directly after this one (by setting order to 1).
	order: 1
});

viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
	content: `[${localize('detectThenRunAndDebug', "Show all automatic debug configurations")}](command:${SELECT_AND_START_ID}).`,
	when: CONTEXT_DEBUGGERS_AVAILABLE,
	group: ViewContentGroups.Debug,
	order: 10
});

viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
	content: localize(
		{
			key: 'customizeRunAndDebug',
			comment: [
				'Please do not translate the word "command", it is part of our internal syntax which must not change',
				'{Locked="](command:{0})"}'
			]
		},
		"To customize Run and Debug [create a launch.json file](command:{0}).", DEBUG_CONFIGURE_COMMAND_ID),
	when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, WorkbenchStateContext.notEqualsTo('empty')),
	group: ViewContentGroups.Debug
});

viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
	content: localize(
		{
			key: 'customizeRunAndDebugOpenFolder',
			comment: [
				'Please do not translate the word "command", it is part of our internal syntax which must not change',
				'Please do not translate "launch.json", it is the specific configuration file name',
				'{Locked="](command:{0})"}',
			]
		},
		"To customize Run and Debug, [open a folder](command:{0}) and create a launch.json file.", (isMacintosh && !isWeb) ? OpenFileFolderAction.ID : OpenFolderAction.ID),
	when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, WorkbenchStateContext.isEqualTo('empty')),
	group: ViewContentGroups.Debug
});

viewsRegistry.registerViewWelcomeContent(WelcomeView.ID, {
	content: localize('allDebuggersDisabled', "All debug extensions are disabled. Enable a debug extension or install a new one from the Marketplace."),
	when: CONTEXT_DEBUG_EXTENSION_AVAILABLE.toNegated(),
	group: ViewContentGroups.Debug
});
