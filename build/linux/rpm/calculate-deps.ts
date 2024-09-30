/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See code-license.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { spawnSync } from "child_process"
import { constants, statSync } from "fs"
import { additionalDeps } from "./dep-lists"

export function generatePackageDeps(files: string[]): Set<string>[] {
  const dependencies: Set<string>[] = files.map((file) =>
    calculatePackageDeps(file),
  )
  const additionalDepsSet = new Set(additionalDeps)
  dependencies.push(additionalDepsSet)
  return dependencies
}

// Based on https://source.chromium.org/chromium/chromium/src/+/main:chrome/installer/linux/rpm/calculate_package_deps.py.
function calculatePackageDeps(binaryPath: string): Set<string> {
  if (
    binaryPath.endsWith("haystack-tunnel") ||
    binaryPath.endsWith("haystack-server")
  ) {
    return new Set()
  }
  try {
    if (!(statSync(binaryPath).mode & constants.S_IXUSR)) {
      throw new Error(
        `Binary ${binaryPath} needs to have an executable bit set.`,
      )
    }
  } catch (e) {
    // The package might not exist. Don't re-throw the error here.
    console.error("Tried to stat " + binaryPath + " but failed.")
  }

  const findRequiresResult = spawnSync("/usr/lib/rpm/find-requires", {
    input: binaryPath + "\n",
  })
  if (findRequiresResult.status !== 0) {
    throw new Error(
      `find-requires failed with exit code ${findRequiresResult.status}.\nstderr: ${findRequiresResult.stderr}`,
    )
  }

  const requires = new Set(
    findRequiresResult.stdout.toString("utf-8").trimEnd().split("\n"),
  )
  console.log("Requires:")
  console.log(requires)
  return requires
}
