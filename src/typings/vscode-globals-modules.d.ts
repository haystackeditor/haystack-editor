/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// AMD2ESM mirgation relevant

declare global {
  /**
   * @deprecated node modules that are in used in a context that
   * shouldn't have access to node_modules (node-free renderer or
   * shared process)
   */
  var _HAYSTACK_NODE_MODULES: {
    crypto: typeof import("crypto")
    zlib: typeof import("zlib")
    net: typeof import("net")
    os: typeof import("os")
    module: typeof import("module")
    fs: typeof import("fs")
    vm: typeof import("vm")
    ["native-watchdog"]: typeof import("native-watchdog")
    perf_hooks: typeof import("perf_hooks")

    ["vsda"]: any
    ["vscode-encrypt"]: any
  }
}

// fake export to make global work
export {}
