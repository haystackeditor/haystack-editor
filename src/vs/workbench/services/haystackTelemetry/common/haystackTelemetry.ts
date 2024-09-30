import { createDecorator } from 'vs/platform/instantiation/common/instantiation'

export const IHaystackTelemetryService =
  createDecorator<IHaystackTelemetryService>("haystackTelemetryService")

export interface IHaystackTelemetryService {
	sendTelemetry: (eventName: string, properties?: any) => void
}
