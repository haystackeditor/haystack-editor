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

export = new (class ApiEventNaming implements eslint.Rule.RuleModule {
  readonly meta: eslint.Rule.RuleMetaData = {
    messages: {
      usage: "Use the Thenable-type instead of the Promise type",
    },
  }

  create(context: eslint.Rule.RuleContext): eslint.Rule.RuleListener {
    return {
      ['TSTypeAnnotation TSTypeReference Identifier[name="Promise"]']: (
        node: any,
      ) => {
        context.report({
          node,
          messageId: "usage",
        })
      },
    }
  }
})()
