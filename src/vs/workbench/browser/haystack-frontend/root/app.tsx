/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import * as React from "react"
// @ts-ignore
import { createRoot } from "react-dom"
import "vs/css!./app"
import { RendererManager } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager"
import { RendererManagerImpl } from "vs/workbench/browser/haystack-frontend/canvas/renderer_manager_impl"
import { UiManager } from "vs/workbench/browser/haystack-frontend/canvas/ui_manager"
import {
  appContainerRef,
  canvasRef,
  overlayRef,
} from "vs/workbench/browser/haystack-frontend/root/app_common"
import { MainToolbar } from "vs/workbench/browser/haystack-frontend/root/main_toolbar"
import { ReactOverlay } from "vs/workbench/browser/haystack-frontend/root/react_overlay"
import { getWorkspaceStore } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

export const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
})

interface AppProps {
  canvasColor: string
}

function App({ canvasColor }: AppProps) {
  React.useEffect(() => {
    const rendererManager = RendererManager.getInstance()
    const uiManager = UiManager.getInstance()
    const hexColorString = canvasColor.replace("#", "0x")
    const hexColor = Number(hexColorString)
    rendererManager.initialize(hexColor)
    uiManager.initialize()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <div className="appContainer" ref={appContainerRef}>
        <div ref={overlayRef} />
        <MainToolbar />
        <div className="page">
          <canvas
            className="rootCanvas"
            onFocus={(e) => e.preventDefault()}
            id="ui-canvas"
            tabIndex={-1}
            style={{ zIndex: 999, pointerEvents: "none" }}
          />
          <div className="resizer" id="pixi-resizer">
            <ReactOverlay />
          </div>
          <canvas
            className="rootCanvas"
            onFocus={(e) => e.preventDefault()}
            id="pixi-canvas"
            tabIndex={-1}
            ref={canvasRef}
          />
        </div>
      </div>
    </QueryClientProvider>
  )
}

export function renderHaystackApp(container: HTMLElement, canvasColor: string) {
  WorkspaceStoreWrapper.setWorkspaceStore(getWorkspaceStore())
  RendererManager.setInstance(new RendererManagerImpl())

  const root = createRoot(container)

  root.render(<App canvasColor={canvasColor} />)
}
