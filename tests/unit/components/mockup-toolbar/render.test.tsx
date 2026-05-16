/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { MockupToolbar } from "@/components/MockupToolbar/MockupToolbar";

describe("MockupToolbar", () => {
  it("renders all 9 controls in order", () => {
    const noop = () => {};
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(MockupToolbar, {
        zoom: 100,
        versionLabel: "v3",
        mode: "edit",
        onModeChange: noop,
        onZoomChange: noop,
        onFullscreen: noop,
        onHistory: noop,
        onDiff: noop,
      }));
    });
    expect(container.querySelector('button[aria-label="Edit mode"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Comment mode"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Zoom out"]')).toBeTruthy();
    expect(container.textContent).toContain("100%");
    expect(container.querySelector('button[aria-label="Zoom in"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Fullscreen"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="History"]')).toBeTruthy();
    expect(container.textContent).toContain("v3");
    expect(container.querySelector('button[aria-label="View diff"]')).toBeTruthy();
    act(() => root.unmount()); container.remove();
  });

  it("reflects edit/comment mode via aria-pressed", () => {
    const noop = () => {};
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(MockupToolbar, {
        zoom: 100, versionLabel: "v3", mode: "comment",
        onModeChange: noop, onZoomChange: noop, onFullscreen: noop, onHistory: noop, onDiff: noop,
      }));
    });
    const edit = container.querySelector('button[aria-label="Edit mode"]');
    const comment = container.querySelector('button[aria-label="Comment mode"]');
    expect(edit?.getAttribute("aria-pressed")).toBe("false");
    expect(comment?.getAttribute("aria-pressed")).toBe("true");
    act(() => root.unmount()); container.remove();
  });
});
