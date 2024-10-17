/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Haystack Software Inc. All rights reserved.
 *  Licensed under the PolyForm Strict License 1.0.0. See License.txt in the project root for
 *  license information.
 *--------------------------------------------------------------------------------------------*/

import * as React from "react"
import "vs/css!./app"
import { classNames } from "vs/workbench/browser/haystack-frontend/react_utils/class_names"
import { WorkspaceStoreWrapper } from "vs/workbench/browser/haystack-frontend/workspace/workspace_store_wrapper"

export interface FeedbackButtonProps {}

export function FeedbackButton({}: FeedbackButtonProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  return (
    <div
      className={classNames({
        feedbackButtonContainer: true,
        open: open,
      })}
      style={{
        right: "25px",
        bottom: "20px",
      }}
      ref={containerRef}
      onBlurCapture={(e) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.relatedTarget)
        ) {
          setOpen(false)
        }
      }}
    >
      {open && (
        <div className="feedbackList">
          <button
            onClick={() => {
              WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
                "Email opened"
              )
              WorkspaceStoreWrapper.getWorkspaceState().openUrl(
                "mailto:akshaysg@haystackeditor.com",
                true
              )
            }}
            className="feedbackListButton"
          >
            Email
          </button>
          <button
            onClick={() => {
              WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
                "Twitter link opened"
              )
              WorkspaceStoreWrapper.getWorkspaceState().openUrl(
                "https://x.com/AkshaySubr42403",
                true
              )
            }}
            className="feedbackListButton"
          >
            Twitter
          </button>
          <button
            onClick={() => {
              WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
                "Youtube link opened"
              )
              WorkspaceStoreWrapper.getWorkspaceState().openUrl(
                "https://www.youtube.com/@HaystackEditor",
                true
              )
            }}
            className="feedbackListButton"
          >
            Youtube
          </button>
          <button
            onClick={() => {
              WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
                "GitHub feedback opened"
              )
              WorkspaceStoreWrapper.getWorkspaceState().openUrl(
                "https://github.com/AkshaySG14/haystack-public/issues",
                true
              )
            }}
            className="feedbackListButton"
          >
            GitHub
          </button>
          <button
            onClick={() => {
              WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
                "Discord server opened"
              )
              WorkspaceStoreWrapper.getWorkspaceState().openUrl(
                "https://discord.gg/apFrN6ABxc",
                true
              )
            }}
            className="feedbackListButton"
          >
            Discord
          </button>
        </div>
      )}
      <button
        className={classNames({ feedbackButton: true, open: open })}
        onClick={() => {
          setOpen(!open)
          WorkspaceStoreWrapper.getWorkspaceState().sendTelemetry(
            "Feedback list opened"
          )
        }}
      >
        {"Feedback"}
      </button>
    </div>
  )
}
