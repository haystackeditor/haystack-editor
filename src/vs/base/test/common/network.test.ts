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
import { FileAccess, Schemas } from "vs/base/common/network"
import { isWeb } from "vs/base/common/platform"
import { isEqual } from "vs/base/common/resources"
import { URI } from "vs/base/common/uri"
import { ensureNoDisposablesAreLeakedInTestSuite } from "vs/base/test/common/utils"

suite("network", () => {
  ensureNoDisposablesAreLeakedInTestSuite()
  ;(isWeb ? test.skip : test)("FileAccess: URI (native)", () => {
    // asCodeUri() & asFileUri(): simple, without authority
    let originalFileUri = URI.file("network.test.ts")
    let browserUri = FileAccess.uriToBrowserUri(originalFileUri)
    assert.ok(browserUri.authority.length > 0)
    let fileUri = FileAccess.uriToFileUri(browserUri)
    assert.strictEqual(fileUri.authority.length, 0)
    assert(isEqual(originalFileUri, fileUri))

    // asCodeUri() & asFileUri(): with authority
    originalFileUri = URI.file("network.test.ts").with({
      authority: "test-authority",
    })
    browserUri = FileAccess.uriToBrowserUri(originalFileUri)
    assert.strictEqual(browserUri.authority, originalFileUri.authority)
    fileUri = FileAccess.uriToFileUri(browserUri)
    assert(isEqual(originalFileUri, fileUri))
  })
  ;(isWeb ? test.skip : test)("FileAccess: moduleId (native)", () => {
    const browserUri = FileAccess.asBrowserUri("vs/base/test/node/network.test")
    assert.strictEqual(browserUri.scheme, Schemas.vscodeFileResource)

    const fileUri = FileAccess.asFileUri("vs/base/test/node/network.test")
    assert.strictEqual(fileUri.scheme, Schemas.file)
  })
  ;(isWeb ? test.skip : test)(
    "FileAccess: query and fragment is dropped (native)",
    () => {
      const originalFileUri = URI.file("network.test.ts").with({
        query: "foo=bar",
        fragment: "something",
      })
      const browserUri = FileAccess.uriToBrowserUri(originalFileUri)
      assert.strictEqual(browserUri.query, "")
      assert.strictEqual(browserUri.fragment, "")
    },
  )
  ;(isWeb ? test.skip : test)(
    "FileAccess: query and fragment is kept if URI is already of same scheme (native)",
    () => {
      const originalFileUri = URI.file("network.test.ts").with({
        query: "foo=bar",
        fragment: "something",
      })
      const browserUri = FileAccess.uriToBrowserUri(
        originalFileUri.with({ scheme: Schemas.vscodeFileResource }),
      )
      assert.strictEqual(browserUri.query, "foo=bar")
      assert.strictEqual(browserUri.fragment, "something")

      const fileUri = FileAccess.uriToFileUri(originalFileUri)
      assert.strictEqual(fileUri.query, "foo=bar")
      assert.strictEqual(fileUri.fragment, "something")
    },
  )
  ;(isWeb ? test.skip : test)("FileAccess: web", () => {
    const originalHttpsUri = URI.file("network.test.ts").with({
      scheme: "https",
    })
    const browserUri = FileAccess.uriToBrowserUri(originalHttpsUri)
    assert.strictEqual(originalHttpsUri.toString(), browserUri.toString())
  })

  test("FileAccess: remote URIs", () => {
    const originalRemoteUri = URI.file("network.test.ts").with({
      scheme: Schemas.vscodeRemote,
    })
    const browserUri = FileAccess.uriToBrowserUri(originalRemoteUri)
    assert.notStrictEqual(originalRemoteUri.scheme, browserUri.scheme)
  })
})
