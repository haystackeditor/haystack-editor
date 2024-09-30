/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITextModel } from "vs/editor/common/model"
import { ICoordinatesConverter } from "vs/editor/common/viewModel"
import {
  CursorConfiguration,
  ICursorSimpleModel,
} from "vs/editor/common/cursorCommon"
import { IRange } from "vs/editor/common/core/range"

export class CursorContext {
  _cursorContextBrand: void = undefined

  public readonly model: ITextModel
  public readonly viewModel: ICursorSimpleModel
  public readonly coordinatesConverter: ICoordinatesConverter
  public readonly cursorConfig: CursorConfiguration

  constructor(
    model: ITextModel,
    public readonly editRange: IRange | undefined,
    viewModel: ICursorSimpleModel,
    coordinatesConverter: ICoordinatesConverter,
    cursorConfig: CursorConfiguration,
  ) {
    this.model = model
    this.viewModel = viewModel
    this.coordinatesConverter = coordinatesConverter
    this.cursorConfig = cursorConfig
  }
}
