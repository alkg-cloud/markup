// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppMainViewer, type AppMainAnnotation } from '@/components/MockupViewer/AppMainViewer';
import type { VersionRow } from '@/components/VersionChip';

const VERSIONS: VersionRow[] = [
  { id: 'v3', label: 'v3', current: true, createdBy: 'u1', createdByType: 'user' },
  { id: 'v2', label: 'v2', current: false, createdBy: 'u1', createdByType: 'user' },
];

const ANNOTATIONS: AppMainAnnotation[] = [];

describe('AppMainViewer historic mode', () => {
  it('viewingVid === currentVid → no banner, "+ New annotation" present', () => {
    const html = renderToStaticMarkup(
      <AppMainViewer
        mockupId="m1"
        mockupSrc="/m/m1/index.html"
        currentUser="A"
        versions={VERSIONS}
        currentVid="v3"
        viewingVid="v3"
        initialAnnotations={ANNOTATIONS}
      />,
    );
    expect(html).not.toContain('Viewing');
    expect(html).toContain('New annotation');
  });

  it('viewingVid !== currentVid → banner present, "+ New annotation" hidden', () => {
    const html = renderToStaticMarkup(
      <AppMainViewer
        mockupId="m1"
        mockupSrc="/m/m1/index.html"
        currentUser="A"
        versions={VERSIONS}
        currentVid="v3"
        viewingVid="v2"
        initialAnnotations={ANNOTATIONS}
      />,
    );
    expect(html).toContain('Viewing v2');
    expect(html).toContain('Back to v3 (current)');
    expect(html).not.toContain('aria-label="New annotation');
  });

  it('viewingVid !== currentVid → iframe src carries ?v=<vid>', () => {
    const html = renderToStaticMarkup(
      <AppMainViewer
        mockupId="m1"
        mockupSrc="/m/m1/index.html"
        currentUser="A"
        versions={VERSIONS}
        currentVid="v3"
        viewingVid="v2"
        initialAnnotations={ANNOTATIONS}
      />,
    );
    expect(html).toContain('src="/m/m1/index.html?v=v2"');
  });

  it('viewingVid unknown vid → treated as non-historic (no banner, no ?v in src)', () => {
    const html = renderToStaticMarkup(
      <AppMainViewer
        mockupId="m1"
        mockupSrc="/m/m1/index.html"
        currentUser="A"
        versions={VERSIONS}
        currentVid="v3"
        viewingVid="vGHOST"
        initialAnnotations={ANNOTATIONS}
      />,
    );
    expect(html).not.toContain('Viewing');
    expect(html).toContain('src="/m/m1/index.html"');
    expect(html).not.toContain('?v=vGHOST');
  });
});
