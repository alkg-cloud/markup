type Snapshot = {
  document: { store: Record<string, any> };
} & Record<string, unknown>;

const SCREENSHOT_NAME = 'screenshot';

function isImageScreenshotAsset(record: unknown): boolean {
  if (!record || typeof record !== 'object') return false;
  const r = record as any;
  return (
    r.typeName === 'asset' &&
    r.type === 'image' &&
    r.props &&
    r.props.name === SCREENSHOT_NAME
  );
}

function getStore(snapshot: any): Record<string, any> | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  // tldraw v3: { document: { store: {...} } }
  if (snapshot.document?.store && typeof snapshot.document.store === 'object') {
    return snapshot.document.store;
  }
  // tldraw v2: { store: {...} } (legacy or test snapshots)
  if (snapshot.store && typeof snapshot.store === 'object') {
    return snapshot.store;
  }
  return null;
}

export function stripScreenshotBase64<T>(snapshot: T): T {
  const cloned = JSON.parse(JSON.stringify(snapshot)) as T;
  const store = getStore(cloned);
  if (!store) return cloned;
  for (const record of Object.values(store)) {
    if (isImageScreenshotAsset(record)) {
      const props = (record as any).props;
      props.src = '';
      props.meta = { ...(props.meta ?? {}), externalRef: SCREENSHOT_NAME };
    }
  }
  return cloned;
}

export function rehydrateScreenshotBase64<T>(snapshot: T, screenshotUrl: string): T {
  const cloned = JSON.parse(JSON.stringify(snapshot)) as T;
  const store = getStore(cloned);
  if (!store) return cloned;
  for (const record of Object.values(store)) {
    if (
      record &&
      typeof record === 'object' &&
      (record as any).typeName === 'asset' &&
      (record as any).type === 'image' &&
      (record as any).props?.meta?.externalRef === SCREENSHOT_NAME
    ) {
      (record as any).props.src = screenshotUrl;
    }
  }
  return cloned;
}
