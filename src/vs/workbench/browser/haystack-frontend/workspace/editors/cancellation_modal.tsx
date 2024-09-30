/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./editors"
import { CautionSvg } from "vs/workbench/browser/haystack-frontend/workspace/editors/svgs"

interface CancellationModalProps {
  identifier: string
  onSave: () => void
  onClose: () => void
  onCancel: () => void
}

export function CancellationModal({
  identifier,
  onSave,
  onClose,
  onCancel,
}: CancellationModalProps) {
  return (
    <div>
      <div className="editorCloseCancellationModalOverlay" />
      <div className="editorCloseCancellationModal">
        <CautionSvg customStyle={{ marginTop: "10px" }} />
        <div className="editorCloseCancellationModalTitle">
          Save changes to {identifier}?
        </div>
        <button
          className="editorCloseCancellationModalButton"
          onClick={() => {
            onSave()
            onClose()
          }}
        >
          Save
        </button>
        <button
          className="editorCloseCancellationModalButton"
          onClick={onClose}
        >
          Don't save
        </button>
        <button
          className="editorCloseCancellationModalButton"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
