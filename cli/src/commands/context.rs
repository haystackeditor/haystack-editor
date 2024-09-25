/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

use crate::{log, state::LauncherPaths};

use super::args::CliCore;

pub struct CommandContext {
	pub log: log::Logger,
	pub paths: LauncherPaths,
	pub args: CliCore,
	pub http: reqwest::Client,
}
