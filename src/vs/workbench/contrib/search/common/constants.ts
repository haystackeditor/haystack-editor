/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RawContextKey } from "vs/platform/contextkey/common/contextkey"

export const enum SearchCommandIds {
  FindInFilesActionId = "workbench.action.findInFiles",
  FocusActiveEditorCommandId = "search.action.focusActiveEditor",
  FocusSearchFromResults = "search.action.focusSearchFromResults",
  OpenMatch = "search.action.openResult",
  OpenMatchToSide = "search.action.openResultToSide",
  RemoveActionId = "search.action.remove",
  CopyPathCommandId = "search.action.copyPath",
  CopyMatchCommandId = "search.action.copyMatch",
  CopyAllCommandId = "search.action.copyAll",
  OpenInEditorCommandId = "search.action.openInEditor",
  ClearSearchHistoryCommandId = "search.action.clearHistory",
  FocusSearchListCommandID = "search.action.focusSearchList",
  ReplaceActionId = "search.action.replace",
  ReplaceAllInFileActionId = "search.action.replaceAllInFile",
  ReplaceAllInFolderActionId = "search.action.replaceAllInFolder",
  CloseReplaceWidgetActionId = "closeReplaceInFilesWidget",
  ToggleCaseSensitiveCommandId = "toggleSearchCaseSensitive",
  ToggleWholeWordCommandId = "toggleSearchWholeWord",
  ToggleRegexCommandId = "toggleSearchRegex",
  TogglePreserveCaseId = "toggleSearchPreserveCase",
  AddCursorsAtSearchResults = "addCursorsAtSearchResults",
  RevealInSideBarForSearchResults = "search.action.revealInSideBar",
  ReplaceInFilesActionId = "workbench.action.replaceInFiles",
  ShowAllSymbolsActionId = "workbench.action.showAllSymbols",
  QuickTextSearchActionId = "workbench.action.quickTextSearch",
  CancelSearchActionId = "search.action.cancel",
  RefreshSearchResultsActionId = "search.action.refreshSearchResults",
  FocusNextSearchResultActionId = "search.action.focusNextSearchResult",
  FocusPreviousSearchResultActionId = "search.action.focusPreviousSearchResult",
  ToggleSearchOnTypeActionId = "workbench.action.toggleSearchOnType",
  CollapseSearchResultsActionId = "search.action.collapseSearchResults",
  ExpandSearchResultsActionId = "search.action.expandSearchResults",
  ExpandRecursivelyCommandId = "search.action.expandRecursively",
  ClearSearchResultsActionId = "search.action.clearSearchResults",
  ViewAsTreeActionId = "search.action.viewAsTree",
  ViewAsListActionId = "search.action.viewAsList",
  ShowAIResultsActionId = "search.action.showAIResults",
  HideAIResultsActionId = "search.action.hideAIResults",
  ToggleQueryDetailsActionId = "workbench.action.search.toggleQueryDetails",
  ExcludeFolderFromSearchId = "search.action.excludeFromSearch",
  FocusNextInputActionId = "search.focus.nextInputBox",
  FocusPreviousInputActionId = "search.focus.previousInputBox",
  RestrictSearchToFolderId = "search.action.restrictSearchToFolder",
  FindInFolderId = "filesExplorer.findInFolder",
  FindInWorkspaceId = "filesExplorer.findInWorkspace",
}

export const SearchContext = {
  SearchViewVisibleKey: new RawContextKey<boolean>(
    "searchViewletVisible",
    true,
  ),
  SearchViewFocusedKey: new RawContextKey<boolean>("searchViewletFocus", false),
  InputBoxFocusedKey: new RawContextKey<boolean>("inputBoxFocus", false),
  SearchInputBoxFocusedKey: new RawContextKey<boolean>(
    "searchInputBoxFocus",
    false,
  ),
  ReplaceInputBoxFocusedKey: new RawContextKey<boolean>(
    "replaceInputBoxFocus",
    false,
  ),
  PatternIncludesFocusedKey: new RawContextKey<boolean>(
    "patternIncludesInputBoxFocus",
    false,
  ),
  PatternExcludesFocusedKey: new RawContextKey<boolean>(
    "patternExcludesInputBoxFocus",
    false,
  ),
  ReplaceActiveKey: new RawContextKey<boolean>("replaceActive", false),
  HasSearchResults: new RawContextKey<boolean>("hasSearchResult", false),
  FirstMatchFocusKey: new RawContextKey<boolean>("firstMatchFocus", false),
  FileMatchOrMatchFocusKey: new RawContextKey<boolean>(
    "fileMatchOrMatchFocus",
    false,
  ), // This is actually, Match or File or Folder
  FileMatchOrFolderMatchFocusKey: new RawContextKey<boolean>(
    "fileMatchOrFolderMatchFocus",
    false,
  ),
  FileMatchOrFolderMatchWithResourceFocusKey: new RawContextKey<boolean>(
    "fileMatchOrFolderMatchWithResourceFocus",
    false,
  ), // Excludes "Other files"
  FileFocusKey: new RawContextKey<boolean>("fileMatchFocus", false),
  FolderFocusKey: new RawContextKey<boolean>("folderMatchFocus", false),
  ResourceFolderFocusKey: new RawContextKey<boolean>(
    "folderMatchWithResourceFocus",
    false,
  ),
  IsEditableItemKey: new RawContextKey<boolean>("isEditableItem", true),
  MatchFocusKey: new RawContextKey<boolean>("matchFocus", false),
  ViewHasSearchPatternKey: new RawContextKey<boolean>(
    "viewHasSearchPattern",
    false,
  ),
  ViewHasReplacePatternKey: new RawContextKey<boolean>(
    "viewHasReplacePattern",
    false,
  ),
  ViewHasFilePatternKey: new RawContextKey<boolean>(
    "viewHasFilePattern",
    false,
  ),
  ViewHasSomeCollapsibleKey: new RawContextKey<boolean>(
    "viewHasSomeCollapsibleResult",
    false,
  ),
  InTreeViewKey: new RawContextKey<boolean>("inTreeView", false),
  AIResultsVisibleKey: new RawContextKey<boolean>("AIResultsVisibleKey", false),
  hasAIResultProvider: new RawContextKey<boolean>(
    "hasAIResultProviderKey",
    false,
  ),
}
