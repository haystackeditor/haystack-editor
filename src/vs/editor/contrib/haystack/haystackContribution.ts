/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
  ShowCanvasDots,
  CopilotOptIn,
  CopilotOptOut,
  ImportSettingsAction,
  HideCanvasDots,
  ResetZoomLevel,
  EditAiApiKeys,
  FocusOnEditorContainerAction,
  FocusOnCanvasAction,
  GoBackInSelectionAction,
  GoForwardInSelectionAction,
  GoToFileAction,
  GoToDeepestSymbolAction,
  GoUpOneLevelAction,
  GoDownOneLevelAction,
  ViewIncomingDependenciesAction,
  ViewOutgoingDependenciesAction,
  HaystackKeybindingsAction,
  PinCurrentEditorAction,
  UnpinCurrentEditorAction,
  ShowNavigationBar,
  HideNavigationBar,
} from "vs/editor/contrib/haystack/haystackActions"
import { registerAction2 } from "vs/platform/actions/common/actions"

registerAction2(CopilotOptOut)
registerAction2(CopilotOptIn)
registerAction2(ResetZoomLevel)
registerAction2(ImportSettingsAction)
registerAction2(HideCanvasDots)
registerAction2(ShowCanvasDots)
registerAction2(EditAiApiKeys)
registerAction2(HaystackKeybindingsAction)
registerAction2(FocusOnEditorContainerAction)
registerAction2(FocusOnCanvasAction)
registerAction2(GoBackInSelectionAction)
registerAction2(GoForwardInSelectionAction)
registerAction2(GoUpOneLevelAction)
registerAction2(GoDownOneLevelAction)
registerAction2(GoToFileAction)
registerAction2(GoToDeepestSymbolAction)
registerAction2(ViewIncomingDependenciesAction)
registerAction2(ViewOutgoingDependenciesAction)
registerAction2(PinCurrentEditorAction)
registerAction2(UnpinCurrentEditorAction)
registerAction2(ShowNavigationBar)
registerAction2(HideNavigationBar)
