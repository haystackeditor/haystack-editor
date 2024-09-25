/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RenderingContext } from "vs/editor/browser/view/renderingContext"
import { ViewEventHandler } from "vs/editor/common/viewEventHandler"

export abstract class DynamicViewOverlay extends ViewEventHandler {
  public abstract prepareRender(ctx: RenderingContext): void

  public abstract render(startLineNumber: number, lineNumber: number): string
}
