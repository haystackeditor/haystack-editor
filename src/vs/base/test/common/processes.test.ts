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
import * as processes from "vs/base/common/processes"
import { ensureNoDisposablesAreLeakedInTestSuite } from "vs/base/test/common/utils"

suite("Processes", () => {
  ensureNoDisposablesAreLeakedInTestSuite()

  test("sanitizeProcessEnvironment", () => {
    const env = {
      FOO: "bar",
      ELECTRON_ENABLE_STACK_DUMPING: "x",
      ELECTRON_ENABLE_LOGGING: "x",
      ELECTRON_NO_ASAR: "x",
      ELECTRON_NO_ATTACH_CONSOLE: "x",
      ELECTRON_RUN_AS_NODE: "x",
      HAYSTACK_CLI: "x",
      HAYSTACK_DEV: "x",
      HAYSTACK_IPC_HOOK: "x",
      HAYSTACK_NLS_CONFIG: "x",
      HAYSTACK_PORTABLE: "3",
      HAYSTACK_PID: "x",
      HAYSTACK_SHELL_LOGIN: "1",
      HAYSTACK_CODE_CACHE_PATH: "x",
      HAYSTACK_NEW_VAR: "x",
      GDK_PIXBUF_MODULE_FILE: "x",
      GDK_PIXBUF_MODULEDIR: "x",
    }
    processes.sanitizeProcessEnvironment(env)
    assert.strictEqual(env["FOO"], "bar")
    assert.strictEqual(env["HAYSTACK_SHELL_LOGIN"], "1")
    assert.strictEqual(env["HAYSTACK_PORTABLE"], "3")
    assert.strictEqual(Object.keys(env).length, 3)
  })
})
