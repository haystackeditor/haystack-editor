/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./design_components"
import {
  GenericInputArgs,
  useGlobalState,
} from "vs/workbench/browser/haystack-frontend/global_state/global_store"
import { focusOnPixiCanvas } from "vs/workbench/browser/haystack-frontend/canvas_utils/focus_on_pixi_canvas"
import { KeyCode } from "vs/workbench/browser/haystack-frontend/canvas/keyboard_constants"
import { RendererManager } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import { Vector } from "vs/workbench/browser/haystack-frontend/canvas/vector"

const FLOATING_INPUT_WIDTH = 400

interface FloatingInputProps {
  args: GenericInputArgs
}

export function FloatingInputComponent({ args }: FloatingInputProps) {
  const closeInput = useGlobalState((state) => state.closeGenericInput)

  const closeInputWrapper = () => {
    closeInput()
    focusOnPixiCanvas()
  }

  const centerOfScene = getCenterOfScene()

  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.code) {
      case KeyCode.ESCAPE:
        args.onCancel()
        closeInputWrapper()
        break
      case KeyCode.ENTER:
        args.onCompletion(inputRef.current?.value ?? "")
        closeInput()
        e.preventDefault()
        break
    }
  }

  return (
    <div
      className="fuzzySearchContainer"
      style={{
        transform: `translate(${
          centerOfScene.x - FLOATING_INPUT_WIDTH / 2
        }px, ${centerOfScene.y + 10}px)`,
      }}
      ref={containerRef}
    >
      <input
        className="fuzzySearchInput"
        ref={inputRef}
        autoFocus={true}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget)) {
            args.onCancel()
            closeInputWrapper()
          }
        }}
        placeholder={args.placeholder}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}

function getCenterOfScene() {
  const rendererManager = RendererManager.getInstance()
  const centerOfScene = rendererManager.getCenterOfCanvasViewport()
  return new Vector(centerOfScene.x, 0)
}
