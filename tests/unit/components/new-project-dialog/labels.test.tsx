/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { NewProjectDialog } from "@/components/NewProjectDialog/NewProjectDialog";

describe("NewProjectDialog labels", () => {
  it("renders ALL-CAPS labels and Title-Case button + placeholder", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(NewProjectDialog, {
          open: true,
          onClose: () => {},
          onSaved: () => {},
        })
      );
    });
    expect(container.textContent).toContain("PROJECT NAME");
    expect(container.textContent).toContain("ICON");
    expect(container.textContent).toContain("Create Project");
    const input = container.querySelector("input[placeholder]");
    expect(input?.getAttribute("placeholder")).toBe("My Project");
    act(() => root.unmount());
    container.remove();
  });
});
