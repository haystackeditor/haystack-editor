import { InstantiationType, registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IHaystackTelemetryService } from 'vs/workbench/services/haystackTelemetry/common/haystackTelemetry';
import { Disposable } from "vs/base/common/lifecycle"
import { WorkspaceStoreWrapper } from 'vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper';

export class HaystackTelemetryService extends Disposable implements IHaystackTelemetryService {
	declare readonly _serviceBrand: undefined

	constructor() {
		super()
		WorkspaceStoreWrapper.workspaceStoreIsInitialized.p.then(() => {
			WorkspaceStoreWrapper.getWorkspaceState().setHaystackTelemetryService(this)
		})
	}
	public async sendTelemetry(eventName: string, properties?: any) {}
}

registerSingleton(
	IHaystackTelemetryService,
	HaystackTelemetryService,
	InstantiationType.Delayed,
)
