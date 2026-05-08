import { describe, expect, it } from 'vitest';
import { rehydrateScreenshotBase64, stripScreenshotBase64 } from '@/lib/tldraw/snapshot-screenshot';

const BASE64_DATA_URL = `data:image/png;base64,iVBORw0KGgo${'A'.repeat(1000)}`;

const sampleSnapshot = {
  document: {
    store: {
      'asset:abc': {
        typeName: 'asset',
        type: 'image',
        props: { name: 'screenshot', src: BASE64_DATA_URL, w: 800, h: 600 },
      },
      'asset:other': {
        typeName: 'asset',
        type: 'image',
        props: { name: 'pasted-image', src: 'data:image/png;base64,XYZ' },
      },
      'shape:s1': { typeName: 'shape', type: 'arrow', props: {} },
    },
  },
};

describe('stripScreenshotBase64', () => {
  it('removes src from screenshot asset, leaves other image assets alone', () => {
    const stripped = stripScreenshotBase64(sampleSnapshot);
    const screenshotAsset = stripped.document.store['asset:abc'];
    expect(screenshotAsset.props.src).toBe('');
    expect(screenshotAsset.props.meta?.externalRef).toBe('screenshot');
    expect(stripped.document.store['asset:other'].props.src).toMatch(/^data:image/);
  });

  it('is idempotent', () => {
    const a = stripScreenshotBase64(sampleSnapshot);
    const b = stripScreenshotBase64(a);
    expect(b).toEqual(a);
  });

  it('does not mutate the input', () => {
    const before = JSON.stringify(sampleSnapshot);
    stripScreenshotBase64(sampleSnapshot);
    expect(JSON.stringify(sampleSnapshot)).toBe(before);
  });
});

describe('rehydrateScreenshotBase64', () => {
  it('round-trips: strip then rehydrate restores src to provided URL', () => {
    const stripped = stripScreenshotBase64(sampleSnapshot);
    const rehydrated = rehydrateScreenshotBase64(stripped, '/api/foo/screenshot');
    expect(rehydrated.document.store['asset:abc'].props.src).toBe('/api/foo/screenshot');
  });

  it('leaves snapshots with no externalRef untouched', () => {
    const before = JSON.parse(JSON.stringify(sampleSnapshot));
    const out = rehydrateScreenshotBase64(before, '/api/foo/screenshot');
    expect(out.document.store['asset:abc'].props.src).toBe(BASE64_DATA_URL);
  });
});
