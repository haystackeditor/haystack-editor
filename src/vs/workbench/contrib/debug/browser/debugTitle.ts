/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IDebugService, State } from 'vs/workbench/contrib/debug/common/debug';
import { dispose, IDisposable } from 'vs/base/common/lifecycle';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { ITitleService } from 'vs/workbench/services/title/browser/titleService';

export class DebugTitleContribution implements IWorkbenchContribution {

	private toDispose: IDisposable[] = [];

	constructor(
		@IDebugService debugService: IDebugService,
		@IHostService hostService: IHostService,
		@ITitleService titleService: ITitleService
	) {
		const updateTitle = () => {
			if (debugService.state === State.Stopped && !hostService.hasFocus) {
				titleService.updateProperties({ prefix: '🔴' });
			} else {
				titleService.updateProperties({ prefix: '' });
			}
		};
		this.toDispose.push(debugService.onDidChangeState(updateTitle));
		this.toDispose.push(hostService.onDidChangeFocus(updateTitle));
	}

	dispose(): void {
		dispose(this.toDispose);
	}
}
