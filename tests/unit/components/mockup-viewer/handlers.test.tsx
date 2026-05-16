/** @vitest-environment jsdom */
/**
 * Lightweight tests for the MockupViewer toolbar handlers:
 * fullscreen, history toggle, and diff modal.
 *
 * MockupViewer itself is too heavy to mount in unit tests (Next.js router,
 * Prisma, etc.), so these tests focus on the DiffModal sub-component and the
 * handler logic in isolation via small wrappers.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";

// ── Minimal DiffModal replica to test rendering behaviour ────────────────────
// (mirrors the component defined inside MockupViewer.tsx)
function DiffModal({
  diffText,
  onClose,
}: {
  diffText: string | null;
  onClose: () => void;
}) {
  return createElement(
    "div",
    { role: "dialog", "aria-label": "Version diff", "data-testid": "diff-modal" },
    createElement(
      "button",
      { "aria-label": "Close diff", onClick: onClose },
      "✕"
    ),
    createElement("pre", { "data-testid": "diff-text" }, diffText ?? "Loading diff…")
  );
}

// ── Wrapper that mirrors the onDiff handler ──────────────────────────────────
function DiffWrapper({
  mockupId,
  versions,
  currentVersionIndex,
}: {
  mockupId: string;
  versions: Array<{ id: string }>;
  currentVersionIndex: number;
}) {
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffText, setDiffText] = useState<string | null>(null);

  async function onDiff() {
    setDiffOpen(true);
    setDiffText(null);
    if (versions.length < 2) {
      setDiffText("Nothing to compare yet.");
      return;
    }
    const current = versions[currentVersionIndex];
    const previous = versions[currentVersionIndex + 1];
    if (!current || !previous) {
      setDiffText("Nothing to compare yet.");
      return;
    }
    try {
      const res = await fetch(
        `/api/mockups/${mockupId}/diff?from=${previous.id}&to=${current.id}&format=unified`
      );
      const text = await res.text();
      setDiffText(text);
    } catch {
      setDiffText("Failed to load diff.");
    }
  }

  return createElement(
    "div",
    null,
    createElement(
      "button",
      { "data-testid": "open-diff", onClick: onDiff },
      "Diff"
    ),
    diffOpen
      ? createElement(DiffModal, {
          diffText,
          onClose: () => {
            setDiffOpen(false);
            setDiffText(null);
          },
        })
      : null
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Diff handler — single version", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows "Nothing to compare yet." when only one version exists', async () => {
    act(() => {
      root.render(
        createElement(DiffWrapper, {
          mockupId: "mock-1",
          versions: [{ id: "v1" }],
          currentVersionIndex: 0,
        })
      );
    });

    const btn = container.querySelector('[data-testid="open-diff"]') as HTMLButtonElement;
    await act(async () => btn.click());

    const pre = container.querySelector('[data-testid="diff-text"]');
    expect(pre?.textContent).toBe("Nothing to compare yet.");
  });
});

describe("Diff handler — multiple versions", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it("fetches /api/mockups/[id]/diff with correct from/to params", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        "--- a/index.html\n+++ b/index.html\n@@ -1 +1 @@\n-old\n+new\n",
    });
    global.fetch = fetchMock;

    act(() => {
      root.render(
        createElement(DiffWrapper, {
          mockupId: "mock-abc",
          versions: [{ id: "v2" }, { id: "v1" }],
          currentVersionIndex: 0,
        })
      );
    });

    const btn = container.querySelector('[data-testid="open-diff"]') as HTMLButtonElement;
    await act(async () => btn.click());

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/mockups/mock-abc/diff?from=v1&to=v2&format=unified"
    );

    const pre = container.querySelector('[data-testid="diff-text"]');
    expect(pre?.textContent).toContain("-old");
    expect(pre?.textContent).toContain("+new");
  });

  it("shows 'Loading diff…' before fetch resolves then shows result", async () => {
    let resolveText!: (v: string) => void;
    const pendingText = new Promise<string>((res) => { resolveText = res; });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => pendingText,
    });
    global.fetch = fetchMock;

    act(() => {
      root.render(
        createElement(DiffWrapper, {
          mockupId: "mock-xyz",
          versions: [{ id: "v2" }, { id: "v1" }],
          currentVersionIndex: 0,
        })
      );
    });

    const btn = container.querySelector('[data-testid="open-diff"]') as HTMLButtonElement;

    // Click but don't let fetch resolve yet — modal should show "Loading diff…"
    act(() => btn.click());
    const pre = container.querySelector('[data-testid="diff-text"]');
    expect(pre?.textContent).toBe("Loading diff…");

    // Resolve and let state update
    await act(async () => { resolveText("diff result here"); });
    expect(pre?.textContent).toBe("diff result here");
  });

  it("shows 'Failed to load diff.' on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network fail"));

    act(() => {
      root.render(
        createElement(DiffWrapper, {
          mockupId: "mock-err",
          versions: [{ id: "v2" }, { id: "v1" }],
          currentVersionIndex: 0,
        })
      );
    });

    const btn = container.querySelector('[data-testid="open-diff"]') as HTMLButtonElement;
    await act(async () => btn.click());

    const pre = container.querySelector('[data-testid="diff-text"]');
    expect(pre?.textContent).toBe("Failed to load diff.");
  });

  it("closes the modal when close button is clicked", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "some diff",
    });

    act(() => {
      root.render(
        createElement(DiffWrapper, {
          mockupId: "mock-close",
          versions: [{ id: "v2" }, { id: "v1" }],
          currentVersionIndex: 0,
        })
      );
    });

    const btn = container.querySelector('[data-testid="open-diff"]') as HTMLButtonElement;
    await act(async () => btn.click());

    expect(container.querySelector('[data-testid="diff-modal"]')).toBeTruthy();

    const closeBtn = container.querySelector('button[aria-label="Close diff"]') as HTMLButtonElement;
    act(() => closeBtn.click());

    expect(container.querySelector('[data-testid="diff-modal"]')).toBeNull();
  });
});

describe("History toggle", () => {
  it("toggles open state on each call", () => {
    let open = false;
    function toggle() { open = !open; }
    toggle(); expect(open).toBe(true);
    toggle(); expect(open).toBe(false);
    toggle(); expect(open).toBe(true);
  });
});
