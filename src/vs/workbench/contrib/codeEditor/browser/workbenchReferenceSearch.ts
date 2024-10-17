/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICodeEditor } from "vs/editor/browser/editorBrowser"
import {
  EditorContributionInstantiation,
  registerEditorContribution,
} from "vs/editor/browser/editorExtensions"
import { ILanguageService } from "vs/editor/common/languages/language"
import { ILanguageFeaturesService } from "vs/editor/common/services/languageFeatures"
import { ReferencesController } from "vs/editor/contrib/gotoSymbol/browser/peek/referencesController"
import { IContextKeyService } from "vs/platform/contextkey/common/contextkey"
import { IInstantiationService } from "vs/platform/instantiation/common/instantiation"
import { IStorageService } from "vs/platform/storage/common/storage"
import { IHaystackService } from "vs/workbench/services/haystack/common/haystackService"

export class WorkbenchReferencesController extends ReferencesController {
  public constructor(
    editor: ICodeEditor,
    @IContextKeyService contextKeyService: IContextKeyService,
    @IHaystackService haystackService: IHaystackService,
    @ILanguageService languageService: ILanguageService,
    @ILanguageFeaturesService languageFeatureService: ILanguageFeaturesService,
    @IInstantiationService instantiationService: IInstantiationService,
    @IStorageService storageService: IStorageService
  ) {
    super(
      false,
      editor,
      contextKeyService,
      haystackService,
      languageService,
      languageFeatureService,
      instantiationService,
      storageService
    )
  }
}

registerEditorContribution(
  ReferencesController.ID,
  WorkbenchReferencesController,
  EditorContributionInstantiation.Lazy
)
