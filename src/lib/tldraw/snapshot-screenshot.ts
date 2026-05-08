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

export function stripScreenshotBase64<T extends Snapshot>(snapshot: T): T {
  const cloned = JSON.parse(JSON.stringify(snapshot)) as T;
  for (const record of Object.values(cloned.document.store)) {
    if (isImageScreenshotAsset(record)) {
      const props = (record as any).props;
      props.src = '';
      props.meta = { ...(props.meta ?? {}), externalRef: SCREENSHOT_NAME };
    }
  }
  return cloned;
}

export function rehydrateScreenshotBase64<T extends Snapshot>(
  snapshot: T,
  screenshotUrl: string,
): T {
  const cloned = JSON.parse(JSON.stringify(snapshot)) as T;
  for (const record of Object.values(cloned.document.store)) {
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
