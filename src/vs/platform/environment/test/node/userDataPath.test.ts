/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from "assert"
import { ensureNoDisposablesAreLeakedInTestSuite } from "vs/base/test/common/utils"
import { OPTIONS, parseArgs } from "vs/platform/environment/node/argv"
import { getUserDataPath } from "vs/platform/environment/node/userDataPath"
import product from "vs/platform/product/common/product"

suite("User data path", () => {
  test("getUserDataPath - default", () => {
    const path = getUserDataPath(
      parseArgs(process.argv, OPTIONS),
      product.nameShort,
    )
    assert.ok(path.length > 0)
  })

  test("getUserDataPath - portable mode", () => {
    const origPortable = process.env["HAYSTACK_PORTABLE"]
    try {
      const portableDir = "portable-dir"
      process.env["HAYSTACK_PORTABLE"] = portableDir

      const path = getUserDataPath(
        parseArgs(process.argv, OPTIONS),
        product.nameShort,
      )
      assert.ok(path.includes(portableDir))
    } finally {
      if (typeof origPortable === "string") {
        process.env["HAYSTACK_PORTABLE"] = origPortable
      } else {
        delete process.env["HAYSTACK_PORTABLE"]
      }
    }
  })

  test("getUserDataPath - --user-data-dir", () => {
    const cliUserDataDir = "cli-data-dir"
    const args = parseArgs(process.argv, OPTIONS)
    args["user-data-dir"] = cliUserDataDir

    const path = getUserDataPath(args, product.nameShort)
    assert.ok(path.includes(cliUserDataDir))
  })

  test("getUserDataPath - HAYSTACK_APPDATA", () => {
    const origAppData = process.env["HAYSTACK_APPDATA"]
    try {
      const appDataDir = "appdata-dir"
      process.env["HAYSTACK_APPDATA"] = appDataDir

      const path = getUserDataPath(
        parseArgs(process.argv, OPTIONS),
        product.nameShort,
      )
      assert.ok(path.includes(appDataDir))
    } finally {
      if (typeof origAppData === "string") {
        process.env["HAYSTACK_APPDATA"] = origAppData
      } else {
        delete process.env["HAYSTACK_APPDATA"]
      }
    }
  })

  ensureNoDisposablesAreLeakedInTestSuite()
})
