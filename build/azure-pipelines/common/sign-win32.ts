/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { main } from './sign';
import * as path from 'path';

main([
	process.env['EsrpCliDllPath']!,
	'sign-windows',
	process.env['ESRPPKI']!,
	process.env['ESRPAADUsername']!,
	process.env['ESRPAADPassword']!,
	path.dirname(process.argv[2]),
	path.basename(process.argv[2])
]);
