/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize2 } from "vs/nls"

export const Categories = Object.freeze({
  Haystack: localize2("haystack", "Haystack"),
  View: localize2("view", "View"),
  Help: localize2("help", "Help"),
  Settings: localize2("settings", "Settings"),
  Test: localize2("test", "Test"),
  File: localize2("file", "File"),
  Preferences: localize2("preferences", "Preferences"),
  Developer: localize2(
    {
      key: "developer",
      comment: [
        "A developer on Code itself or someone diagnosing issues in Code",
      ],
    },
    "Developer"
  ),
})
