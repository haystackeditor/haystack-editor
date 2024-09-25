/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as eslint from "eslint"

export = new (class NoAsyncSuite implements eslint.Rule.RuleModule {
  create(context: eslint.Rule.RuleContext): eslint.Rule.RuleListener {
    function doesCallSuperDispose(node: any) {
      if (!node.override) {
        return
      }

      const body = context.getSourceCode().getText(node)

      if (body.includes("super.dispose")) {
        return
      }

      context.report({
        node,
        message: "dispose() should call super.dispose()",
      })
    }

    return {
      ['MethodDefinition[override][key.name="dispose"]']: doesCallSuperDispose,
    }
  }
})()
