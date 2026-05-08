'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  index: number;
  annotationId: string;
  /** Position in iframe-wrapper coordinates */
  x: number;
  y: number;
  status: 'open' | 'resolved' | string;
}

export function AnnotationPin({ index, annotationId, x, y, status }: Props) {
  const isResolved = status === 'resolved';
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const scale = pressed ? 0.96 : hovered ? 1.12 : 1;
  const brightness = hovered && !pressed ? 1.08 : 1;

  return (
    /*
     * Outer <a> is the focus-visible ring host — it is NOT rotated, so the
     * global :focus-visible rule paints a clean axis-aligned ring. It handles
     * navigation via onClick/onKeyDown. The inner decorative <span> handles
     * the -45deg rotation and scale animation.
     */
    <a
      href={`/annotations/${annotationId}`}
      aria-label={`Annotation ${index}`}
      data-testid={`pin-${annotationId}`}
      onClick={(e) => {
        e.preventDefault();
        router.push(`/annotations/${annotationId}`);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -100%)',
        display: 'inline-block',
        lineHeight: 0,
        borderRadius: '50%',
        textDecoration: 'none',
        /* outline: none intentionally omitted — global :focus-visible rule applies */
      }}
    >
      {/* Visually hidden text satisfies useAnchorContent; aria-label on <a> is the SR label */}
      <span
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
      >
        Annotation {index}
      </span>
      <span
        aria-hidden="true"
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 28,
          height: 28,
          borderRadius: '50% 50% 50% 0',
          background: isResolved ? 'var(--success)' : 'var(--accent)',
          color: 'oklch(15% 0.005 165)',
          fontSize: 11,
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          rotate: '-45deg',
          boxShadow: '0 4px 12px oklch(0% 0 0 / 0.55), inset 0 1px 0 oklch(100% 0 0 / 0.18)',
          transition:
            'transform var(--motion-fast) var(--ease-spring), filter var(--motion-fast) var(--ease-standard)',
          transform: `scale(${scale})`,
          filter: brightness !== 1 ? `brightness(${brightness})` : undefined,
        }}
      >
        <span style={{ rotate: '45deg' }}>{index}</span>
      </span>
    </a>
  );
}
