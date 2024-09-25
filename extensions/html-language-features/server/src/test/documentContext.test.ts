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
import { getDocumentContext } from "../utils/documentContext"

suite("HTML Document Context", () => {
  test("Context", function (): any {
    const docURI = "file:///users/test/folder/test.html"
    const rootFolders = [{ name: "", uri: "file:///users/test/" }]

    const context = getDocumentContext(docURI, rootFolders)
    assert.strictEqual(
      context.resolveReference("/", docURI),
      "file:///users/test/",
    )
    assert.strictEqual(
      context.resolveReference("/message.html", docURI),
      "file:///users/test/message.html",
    )
    assert.strictEqual(
      context.resolveReference("message.html", docURI),
      "file:///users/test/folder/message.html",
    )
    assert.strictEqual(
      context.resolveReference("message.html", "file:///users/test/"),
      "file:///users/test/message.html",
    )
  })
})
