'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

interface Props {
  mockupId: string;
  fromVid: string;
  toVid: string;
  fromCreatedAt: string;
  toCreatedAt: string;
}

export function DiffViewer({ mockupId, fromVid, toVid, fromCreatedAt, toCreatedAt }: Props) {
  const leftRef = useRef<HTMLIFrameElement>(null);
  const rightRef = useRef<HTMLIFrameElement>(null);
  const [overlay, setOverlay] = useState(false);
  const [scrollSync, setScrollSync] = useState(true);
  const suppressRef = useRef(false);

  // Set up scroll sync between iframes (best-effort, same-origin only).
  useEffect(() => {
    const wireScroll = (src: HTMLIFrameElement | null, dst: HTMLIFrameElement | null) => {
      if (!src || !dst) return () => {};
      const onLoad = () => {
        const sw = src.contentWindow;
        if (!sw) return;
        const onScroll = () => {
          if (!scrollSync || suppressRef.current) return;
          const dw = dst.contentWindow;
          if (!dw) return;
          suppressRef.current = true;
          dw.scrollTo({ left: sw.scrollX, top: sw.scrollY, behavior: 'instant' });
          requestAnimationFrame(() => {
            suppressRef.current = false;
          });
        };
        sw.addEventListener('scroll', onScroll, { passive: true });
      };
      src.addEventListener('load', onLoad);
      return () => src.removeEventListener('load', onLoad);
    };
    const u1 = wireScroll(leftRef.current, rightRef.current);
    const u2 = wireScroll(rightRef.current, leftRef.current);
    return () => {
      u1();
      u2();
    };
  }, [scrollSync]);

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100vh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '8px 16px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-primary)',
        }}
      >
        <Link href={`/mockups/${mockupId}`} style={{ color: 'var(--text-secondary)' }}>
          &#8592; Back to mockup
        </Link>
        <span style={{ color: 'var(--text-tertiary)' }}>
          Diff: {new Date(fromCreatedAt).toLocaleString()} &#8594;{' '}
          {new Date(toCreatedAt).toLocaleString()}
        </span>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
          <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} />
          Overlay (50% opacity)
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
          <input
            type="checkbox"
            checked={scrollSync}
            onChange={(e) => setScrollSync(e.target.checked)}
          />
          Scroll sync
        </label>
      </header>
      <div
        style={{
          position: 'relative',
          display: overlay ? 'block' : 'grid',
          gridTemplateColumns: overlay ? undefined : '1fr 1fr',
          minHeight: 0,
        }}
      >
        <iframe
          ref={leftRef}
          title="from"
          src={`/_mockups/${mockupId}/index.html?v=${fromVid}`}
          sandbox="allow-scripts allow-same-origin"
          style={{
            width: '100%',
            height: '100%',
            border: 0,
            background: '#fff',
            position: overlay ? 'absolute' : 'static',
            inset: 0,
          }}
        />
        <iframe
          ref={rightRef}
          title="to"
          src={`/_mockups/${mockupId}/index.html?v=${toVid}`}
          sandbox="allow-scripts allow-same-origin"
          style={{
            width: '100%',
            height: '100%',
            border: 0,
            background: '#fff',
            position: overlay ? 'absolute' : 'static',
            inset: 0,
            opacity: overlay ? 0.5 : 1,
          }}
        />
      </div>
    </div>
  );
}
