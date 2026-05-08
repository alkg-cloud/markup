import { describe, expect, it } from 'vitest';
import { extractDrawings } from '@/lib/intent/parser';

const arrowSnap = {
  document: {
    store: {
      'shape:a1': {
        typeName: 'shape',
        type: 'arrow',
        x: 0,
        y: 0,
        props: { start: { x: 100, y: 100 }, end: { x: 200, y: 200 } },
      },
    },
  },
};

const geoSnap = {
  document: {
    store: {
      'shape:r1': {
        typeName: 'shape',
        type: 'geo',
        x: 880,
        y: 1149,
        props: { geo: 'rectangle', w: 72, h: 30, color: 'red', fill: 'none' },
      },
    },
  },
};

const textSnap = {
  document: {
    store: {
      'shape:t1': {
        typeName: 'shape',
        type: 'text',
        x: 190,
        y: 958,
        props: {
          richText: { content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }] },
          w: 100,
          h: 24,
        },
      },
    },
  },
};

describe('extractDrawings', () => {
  it('extracts arrow with absolute from/to', () => {
    expect(extractDrawings(arrowSnap)).toEqual([
      { kind: 'arrow', from: [100, 100], to: [200, 200] },
    ]);
  });

  it('extracts geo rectangle with bbox + color/fill', () => {
    expect(extractDrawings(geoSnap)).toEqual([
      {
        kind: 'geo',
        geo: 'rectangle',
        color: 'red',
        fill: 'none',
        bbox: [880, 1149, 72, 30],
        text: '',
      },
    ]);
  });

  it('extracts text content as plain string', () => {
    expect(extractDrawings(textSnap)).toEqual([
      { kind: 'text', content: 'hi', bbox: [190, 958, 100, 24] },
    ]);
  });

  it('skips image shapes (the screenshot)', () => {
    const snap = {
      document: {
        store: {
          'shape:img': {
            typeName: 'shape',
            type: 'image',
            x: 0,
            y: 0,
            props: { w: 800, h: 600 },
          },
        },
      },
    };
    expect(extractDrawings(snap)).toEqual([]);
  });

  it('returns empty array when no store found', () => {
    expect(extractDrawings({})).toEqual([]);
    expect(extractDrawings(null)).toEqual([]);
  });
});
