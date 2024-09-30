/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
  Extensions as ConfigurationExtensions,
  IConfigurationRegistry,
} from "vs/platform/configuration/common/configurationRegistry"
import {
  InstantiationType,
  registerSingleton,
} from "vs/platform/instantiation/common/extensions"
import { Registry } from "vs/platform/registry/common/platform"
import { externalUriOpenersConfigurationNode } from "vs/workbench/contrib/externalUriOpener/common/configuration"
import {
  ExternalUriOpenerService,
  IExternalUriOpenerService,
} from "vs/workbench/contrib/externalUriOpener/common/externalUriOpenerService"

registerSingleton(
  IExternalUriOpenerService,
  ExternalUriOpenerService,
  InstantiationType.Delayed,
)

Registry.as<IConfigurationRegistry>(
  ConfigurationExtensions.Configuration,
).registerConfiguration(externalUriOpenersConfigurationNode)
