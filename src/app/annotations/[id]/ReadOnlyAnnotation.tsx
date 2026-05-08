'use client';
import type { TLEditorSnapshot } from '@tldraw/tldraw';
import { AnnotationCanvas } from '@/components/AnnotationCanvas/AnnotationCanvas';

interface Props {
  screenshotUrl: string;
  width: number;
  height: number;
  tldraw: TLEditorSnapshot | null;
}

export function ReadOnlyAnnotation({ screenshotUrl, width, height, tldraw }: Props) {
  if (!tldraw) {
    return (
      <img
        src={screenshotUrl}
        alt="annotation screenshot"
        style={{ width: '100%', display: 'block', borderRadius: 'var(--radius-sm)' }}
      />
    );
  }
  return (
    <div data-testid="annotation-readonly-canvas">
      <AnnotationCanvas
        backgroundUrl={screenshotUrl}
        width={width}
        height={height}
        snapshot={tldraw}
      />
    </div>
  );
}
