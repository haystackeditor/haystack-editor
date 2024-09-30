/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from "vs/base/common/uri"
import {
  isURLDomainTrusted,
  ITrustedDomainService,
} from "vs/workbench/contrib/url/browser/trustedDomainService"

export class MockTrustedDomainService implements ITrustedDomainService {
  _serviceBrand: undefined

  constructor(private readonly _trustedDomains: string[] = []) {}

  isValid(resource: URI): boolean {
    return isURLDomainTrusted(resource, this._trustedDomains)
  }
}
