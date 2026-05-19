import 'server-only';

/* tldraw snapshots are deeply nested + untyped at this layer. Narrowing each
 * record statically would mean re-deriving the entire tldraw schema. The
 * helpers here treat the snapshot as opaque and only touch image-asset
 * records whose `props.name === 'screenshot'`. */

const SCREENSHOT_NAME = 'screenshot';

interface ImageAssetRecord {
  typeName: 'asset';
  type: 'image';
  meta?: Record<string, unknown>;
  props: {
    name?: string;
    src?: string;
    [k: string]: unknown;
  };
}

function isImageScreenshotAsset(record: unknown): record is ImageAssetRecord {
  if (!record || typeof record !== 'object') return false;
  const r = record as ImageAssetRecord;
  return (
    r.typeName === 'asset' &&
    r.type === 'image' &&
    Boolean(r.props) &&
    r.props.name === SCREENSHOT_NAME
  );
}

function getStore(snapshot: unknown): Record<string, unknown> | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const s = snapshot as { document?: { store?: unknown }; store?: unknown };
  if (s.document?.store && typeof s.document.store === 'object') {
    return s.document.store as Record<string, unknown>;
  }
  if (s.store && typeof s.store === 'object') {
    return s.store as Record<string, unknown>;
  }
  return null;
}

export function stripScreenshotBase64<T>(snapshot: T): T {
  const cloned = JSON.parse(JSON.stringify(snapshot)) as T;
  const store = getStore(cloned);
  if (!store) return cloned;
  for (const record of Object.values(store)) {
    if (isImageScreenshotAsset(record)) {
      record.props.src = '';
      record.meta = { ...(record.meta ?? {}), externalRef: SCREENSHOT_NAME };
      delete record.props.meta;
    }
  }
  return cloned;
}

export function rehydrateScreenshotBase64<T>(snapshot: T, screenshotUrl: string): T {
  const cloned = JSON.parse(JSON.stringify(snapshot)) as T;
  const store = getStore(cloned);
  if (!store) return cloned;
  for (const record of Object.values(store)) {
    if (!record || typeof record !== 'object') continue;
    const r = record as ImageAssetRecord;
    if (r.typeName !== 'asset' || r.type !== 'image') continue;
    const topMeta = r.meta as { externalRef?: string } | undefined;
    const propsMeta = (r.props as { meta?: { externalRef?: string } }).meta;
    if (topMeta?.externalRef === SCREENSHOT_NAME || propsMeta?.externalRef === SCREENSHOT_NAME) {
      r.props.src = screenshotUrl;
      delete (r.props as { meta?: unknown }).meta;
    }
  }
  return cloned;
}
