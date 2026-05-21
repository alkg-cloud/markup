// @vitest-environment jsdom

import { act, createElement, useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// React 19 requires this flag for act(...) inside vitest's jsdom env.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Mock XMLHttpRequest. The real XHR class is unusable in jsdom for upload
 * progress + abort introspection (jsdom doesn't drive `upload.onprogress`
 * during `xhr.send(formData)`). We stub the global constructor with a
 * controllable mock that lets tests fire load/error/progress events
 * synchronously, capture the URL / method / body, and assert on `abort()`.
 */
type ProgressInit = { loaded: number; total: number; lengthComputable: boolean };

class MockXHR {
  static instances: MockXHR[] = [];

  method = '';
  url = '';
  body: unknown = null;
  status = 0;
  responseText = '';
  sent = false;
  aborted = false;
  timeout = 0;

  // upload sub-object — listeners for the upload's progress, error,
  // timeout and abort events live here.
  upload: {
    listeners: Record<string, Array<(e: ProgressInit) => void>>;
    addEventListener: (type: string, fn: (e: ProgressInit) => void) => void;
  };

  // top-level listeners — load / error / abort live here.
  private listeners: Record<string, Array<() => void>> = {};

  constructor() {
    MockXHR.instances.push(this);
    const uploadListeners: Record<string, Array<(e: ProgressInit) => void>> = {};
    this.upload = {
      listeners: uploadListeners,
      addEventListener: (type: string, fn: (e: ProgressInit) => void) => {
        const bucket = uploadListeners[type] ?? [];
        bucket.push(fn);
        uploadListeners[type] = bucket;
      },
    };
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  send(body: unknown) {
    this.body = body;
    this.sent = true;
  }

  abort() {
    this.aborted = true;
    this.fire('abort');
  }

  addEventListener(type: string, fn: () => void) {
    const bucket = this.listeners[type] ?? [];
    bucket.push(fn);
    this.listeners[type] = bucket;
  }

  // Test helper: dispatch an upload-progress event.
  fireProgress(init: ProgressInit) {
    for (const fn of this.upload.listeners.progress ?? []) fn(init);
  }

  // Test helper: dispatch a non-progress event on the upload (error,
  // timeout, abort). Real `XMLHttpRequestUpload` dispatches `ProgressEvent`
  // for these too, but the hook does not read the event payload — a
  // bare call is enough.
  fireUpload(type: string) {
    for (const fn of this.upload.listeners[type] ?? []) {
      fn({ loaded: 0, total: 0, lengthComputable: false });
    }
  }

  // Test helper: dispatch a top-level event (load / error / abort).
  fire(type: string) {
    for (const fn of this.listeners[type] ?? []) fn();
  }
}

let OriginalXHR: typeof XMLHttpRequest;

beforeEach(() => {
  MockXHR.instances = [];
  OriginalXHR = globalThis.XMLHttpRequest;
  (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = MockXHR;
});

afterEach(() => {
  (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = OriginalXHR;
});

import { type UploadState, useUploadMockup } from '@/components/NewMockupDialog/useUploadMockup';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

type Api = ReturnType<typeof useUploadMockup>;

/**
 * Hook test harness mirroring `useFilePreview.test.ts`. The hook's
 * current value lives on `latest.current.state`; the imperative API
 * (`start`, `abort`, `reset`) lives on `latest.current.api`. Tests
 * invoke them via `act()` to flush React updates.
 */
function makeHarness() {
  const latest: { current: { state: UploadState; api: Api } | null } = { current: null };

  function Harness() {
    const api = useUploadMockup();
    const apiRef = useRef(api);
    apiRef.current = api;
    useEffect(() => {
      latest.current = { state: api.state, api };
    });
    latest.current = { state: api.state, api };
    return null;
  }

  function render() {
    act(() => {
      root.render(createElement(Harness, null));
    });
  }

  return { latest, render };
}

function htmlFile(name = 'index.html'): File {
  return new File(['<html></html>'], name, { type: 'text/html' });
}

function lastXhr(): MockXHR {
  const xhr = MockXHR.instances[MockXHR.instances.length - 1];
  if (!xhr) throw new Error('No XHR created');
  return xhr;
}

describe('useUploadMockup', () => {
  it('initial state is idle', () => {
    const { latest, render } = makeHarness();
    render();
    expect(latest.current?.state).toEqual({ status: 'idle' });
  });

  it('start(add) transitions to uploading with progress 0', () => {
    const { latest, render } = makeHarness();
    render();

    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'my-mockup',
        projectId: 'p1',
        folderId: 'f1',
      });
    });

    expect(latest.current?.state).toEqual({ status: 'uploading', progress: 0 });
    const xhr = lastXhr();
    expect(xhr.method).toBe('POST');
    expect(xhr.url).toBe('/api/mockups');
    expect(xhr.sent).toBe(true);
  });

  it('progress event with lengthComputable updates progress', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'x',
        projectId: null,
        folderId: null,
      });
    });

    act(() => {
      lastXhr().fireProgress({ loaded: 5000, total: 10000, lengthComputable: true });
    });

    expect(latest.current?.state).toEqual({ status: 'uploading', progress: 0.5 });
  });

  it('progress event with lengthComputable=false keeps previous progress', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'x',
        projectId: null,
        folderId: null,
      });
    });

    // Establish a known progress value first.
    act(() => {
      lastXhr().fireProgress({ loaded: 2000, total: 10000, lengthComputable: true });
    });
    expect(latest.current?.state).toEqual({ status: 'uploading', progress: 0.2 });

    // Now a non-computable event — must NOT overwrite to NaN.
    act(() => {
      lastXhr().fireProgress({ loaded: 0, total: 0, lengthComputable: false });
    });
    expect(latest.current?.state).toEqual({ status: 'uploading', progress: 0.2 });
  });

  it('201 + valid JSON → success with parsed body', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'x',
        projectId: null,
        folderId: null,
      });
    });

    const xhr = lastXhr();
    xhr.status = 201;
    xhr.responseText = JSON.stringify({
      id: 'mck_1',
      slug: 'x',
      currentVersionId: 'ver_1',
    });
    act(() => xhr.fire('load'));

    expect(latest.current?.state).toEqual({
      status: 'success',
      mockup: { id: 'mck_1', slug: 'x' },
    });
  });

  it('409 duplicate_name → error field route with existing preserved', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'dup',
        projectId: null,
        folderId: null,
      });
    });

    const xhr = lastXhr();
    xhr.status = 409;
    xhr.responseText = JSON.stringify({
      error: 'duplicate_name',
      detail: 'A mockup named "dup" already exists.',
      existing: { id: 'mck_old', slug: 'dup' },
    });
    act(() => xhr.fire('load'));

    expect(latest.current?.state.status).toBe('error');
    if (latest.current?.state.status === 'error') {
      expect(latest.current.state.route).toBe('field');
      expect(latest.current.state.error.kind).toBe('duplicate_name');
      if (latest.current.state.error.kind === 'duplicate_name') {
        expect(latest.current.state.error.existing).toEqual({ id: 'mck_old', slug: 'dup' });
      }
    }
  });

  it('400 invalid_name → error field route', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'Bad Name',
        projectId: null,
        folderId: null,
      });
    });

    const xhr = lastXhr();
    xhr.status = 400;
    xhr.responseText = JSON.stringify({ error: 'invalid_name', detail: 'not url-safe' });
    act(() => xhr.fire('load'));

    expect(latest.current?.state.status).toBe('error');
    if (latest.current?.state.status === 'error') {
      expect(latest.current.state.route).toBe('field');
      expect(latest.current.state.error.kind).toBe('invalid_name');
    }
  });

  it('413 file_too_large → global route with limit', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'x',
        projectId: null,
        folderId: null,
      });
    });

    const xhr = lastXhr();
    xhr.status = 413;
    xhr.responseText = JSON.stringify({ error: 'file_too_large', limit: 10485760 });
    act(() => xhr.fire('load'));

    expect(latest.current?.state.status).toBe('error');
    if (latest.current?.state.status === 'error') {
      expect(latest.current.state.route).toBe('global');
      expect(latest.current.state.error.kind).toBe('file_too_large');
      if (latest.current.state.error.kind === 'file_too_large') {
        expect(latest.current.state.error.limit).toBe(10485760);
      }
    }
  });

  it('415 unsupported_type → global route', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'x',
        projectId: null,
        folderId: null,
      });
    });
    const xhr = lastXhr();
    xhr.status = 415;
    xhr.responseText = JSON.stringify({ error: 'unsupported_type', detail: 'png' });
    act(() => xhr.fire('load'));

    expect(latest.current?.state.status).toBe('error');
    if (latest.current?.state.status === 'error') {
      expect(latest.current.state.route).toBe('global');
      expect(latest.current.state.error.kind).toBe('unsupported_type');
    }
  });

  it('403 forbidden → global route', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'x',
        projectId: null,
        folderId: null,
      });
    });
    const xhr = lastXhr();
    xhr.status = 403;
    xhr.responseText = JSON.stringify({ error: 'forbidden', detail: 'no perms' });
    act(() => xhr.fire('load'));

    expect(latest.current?.state.status).toBe('error');
    if (latest.current?.state.status === 'error') {
      expect(latest.current.state.route).toBe('global');
      expect(latest.current.state.error.kind).toBe('forbidden');
    }
  });

  it('429 rate_limited → global route with retryAfter', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'x',
        projectId: null,
        folderId: null,
      });
    });
    const xhr = lastXhr();
    xhr.status = 429;
    xhr.responseText = JSON.stringify({ error: 'rate_limited', retryAfter: 30 });
    act(() => xhr.fire('load'));

    expect(latest.current?.state.status).toBe('error');
    if (latest.current?.state.status === 'error') {
      expect(latest.current.state.route).toBe('global');
      expect(latest.current.state.error.kind).toBe('rate_limited');
      if (latest.current.state.error.kind === 'rate_limited') {
        expect(latest.current.state.error.retryAfter).toBe(30);
      }
    }
  });

  it('500 → global server_error route', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'x',
        projectId: null,
        folderId: null,
      });
    });
    const xhr = lastXhr();
    xhr.status = 500;
    xhr.responseText = JSON.stringify({ error: 'server_error', detail: 'boom' });
    act(() => xhr.fire('load'));

    expect(latest.current?.state.status).toBe('error');
    if (latest.current?.state.status === 'error') {
      expect(latest.current.state.route).toBe('global');
      expect(latest.current.state.error.kind).toBe('server_error');
    }
  });

  it('200 with unparseable JSON → server_error global', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'x',
        projectId: null,
        folderId: null,
      });
    });
    const xhr = lastXhr();
    xhr.status = 200;
    xhr.responseText = 'not json';
    act(() => xhr.fire('load'));

    expect(latest.current?.state.status).toBe('error');
    if (latest.current?.state.status === 'error') {
      expect(latest.current.state.route).toBe('global');
      expect(latest.current.state.error.kind).toBe('server_error');
    }
  });

  it('xhr.onerror → network global', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'x',
        projectId: null,
        folderId: null,
      });
    });
    act(() => lastXhr().fire('error'));

    expect(latest.current?.state.status).toBe('error');
    if (latest.current?.state.status === 'error') {
      expect(latest.current.state.route).toBe('global');
      expect(latest.current.state.error.kind).toBe('network');
    }
  });

  it('xhr.upload.error → network global (mid-upload failure)', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'x',
        projectId: null,
        folderId: null,
      });
    });
    expect(latest.current?.state.status).toBe('uploading');

    act(() => lastXhr().fireUpload('error'));

    expect(latest.current?.state.status).toBe('error');
    if (latest.current?.state.status === 'error') {
      expect(latest.current.state.route).toBe('global');
      expect(latest.current.state.error.kind).toBe('network');
    }
  });

  it('xhr.upload.timeout → server_error global with detail=timeout', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'x',
        projectId: null,
        folderId: null,
      });
    });

    // xhr.timeout should be set to the 5-minute ceiling so timeouts can
    // actually fire on hung connections.
    expect(lastXhr().timeout).toBe(5 * 60 * 1000);

    act(() => lastXhr().fireUpload('timeout'));

    expect(latest.current?.state.status).toBe('error');
    if (latest.current?.state.status === 'error') {
      expect(latest.current.state.route).toBe('global');
      expect(latest.current.state.error.kind).toBe('server_error');
      if (latest.current.state.error.kind === 'server_error') {
        expect(latest.current.state.error.detail).toBe('timeout');
      }
    }
  });

  it('xhr.upload.abort clears the in-flight ref (defensive backstop)', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'x',
        projectId: null,
        folderId: null,
      });
    });
    const xhr = lastXhr();

    // Simulate something external calling abort on the upload (e.g. a
    // browser-driven cancellation). The listener should clear the ref so
    // a late `load` event would be treated as superseded.
    act(() => xhr.fireUpload('abort'));

    // A subsequent stray load must be a no-op (no state change).
    xhr.status = 201;
    xhr.responseText = JSON.stringify({ id: 'mck_late', slug: 'late' });
    act(() => xhr.fire('load'));

    // State stays at `uploading` because the load handler short-circuited.
    expect(latest.current?.state.status).toBe('uploading');
  });

  it('abort() returns state to idle and calls xhr.abort', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'x',
        projectId: null,
        folderId: null,
      });
    });
    const xhr = lastXhr();
    expect(latest.current?.state.status).toBe('uploading');

    act(() => latest.current!.api.abort());

    expect(xhr.aborted).toBe(true);
    expect(latest.current?.state).toEqual({ status: 'idle' });
  });

  it('replace mode posts to /api/mockups/<id>/version with only build field', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'replace',
        file: htmlFile(),
        mockupId: 'abc',
      });
    });

    const xhr = lastXhr();
    expect(xhr.url).toBe('/api/mockups/abc/version');
    const body = xhr.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('build')).toBeInstanceOf(Blob);
    expect(body.get('name')).toBeNull();
    expect(body.get('projectId')).toBeNull();
    expect(body.get('folderId')).toBeNull();
  });

  it('add mode with null projectId/folderId omits those fields', () => {
    const { latest, render } = makeHarness();
    render();
    const file = htmlFile();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file,
        name: 'fresh',
        projectId: null,
        folderId: null,
      });
    });

    const body = lastXhr().body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('name')).toBe('fresh');
    expect(body.get('build')).toBeInstanceOf(Blob);
    expect(body.get('projectId')).toBeNull();
    expect(body.get('folderId')).toBeNull();
  });

  it('add mode with project/folder ids includes them', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'm',
        projectId: 'p',
        folderId: 'f',
      });
    });
    const body = lastXhr().body as FormData;
    expect(body.get('projectId')).toBe('p');
    expect(body.get('folderId')).toBe('f');
  });

  it('reset() returns to idle and aborts in-flight XHR', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => {
      latest.current!.api.start({
        mode: 'add',
        file: htmlFile(),
        name: 'x',
        projectId: null,
        folderId: null,
      });
    });
    const xhr = lastXhr();

    act(() => latest.current!.api.reset());

    expect(xhr.aborted).toBe(true);
    expect(latest.current?.state).toEqual({ status: 'idle' });
  });

  it('reset() from idle is a no-op (no XHR created)', () => {
    const { latest, render } = makeHarness();
    render();
    act(() => latest.current!.api.reset());
    expect(MockXHR.instances).toHaveLength(0);
    expect(latest.current?.state).toEqual({ status: 'idle' });
  });
});
