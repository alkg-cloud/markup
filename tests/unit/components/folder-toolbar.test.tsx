/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { FolderToolbar } from "@/components/FolderToolbar/FolderToolbar";

describe("FolderToolbar", () => {
  it("renders '+ New Mockup' and 'New Folder' buttons", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(FolderToolbar, {
        onNewMockup: () => {},
        onNewFolder: () => {},
      }));
    });
    expect(container.querySelector("button")?.textContent).toMatch(/\+ New Mockup/);
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(2);
    expect(buttons[1].textContent).toMatch(/New Folder/);
    act(() => root.unmount()); container.remove();
  });

  it("calls onNewMockup when '+ New Mockup' is clicked", () => {
    const spy = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(FolderToolbar, {
        onNewMockup: spy,
        onNewFolder: () => {},
      }));
    });
    act(() => { (container.querySelectorAll("button")[0] as HTMLButtonElement).click(); });
    expect(spy).toHaveBeenCalledTimes(1);
    act(() => root.unmount()); container.remove();
  });

  it("calls onNewFolder when 'New Folder' is clicked", () => {
    const spy = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(FolderToolbar, {
        onNewMockup: () => {},
        onNewFolder: spy,
      }));
    });
    act(() => { (container.querySelectorAll("button")[1] as HTMLButtonElement).click(); });
    expect(spy).toHaveBeenCalledTimes(1);
    act(() => root.unmount()); container.remove();
  });
});
