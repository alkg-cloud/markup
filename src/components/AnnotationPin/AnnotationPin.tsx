'use client';
import Link from 'next/link';

interface Props {
  index: number;
  annotationId: string;
  /** Position in iframe-wrapper coordinates */
  x: number;
  y: number;
  status: 'open' | 'resolved' | string;
}

export function AnnotationPin({ index, annotationId, x, y, status }: Props) {
  return (
    <Link
      href={`/annotations/${annotationId}`}
      data-testid={`pin-${annotationId}`}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -100%)',
        width: 28,
        height: 28,
        borderRadius: '50% 50% 50% 0',
        background: status === 'resolved' ? 'var(--success, #16a34a)' : 'var(--accent, #2563eb)',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontSize: 12,
        fontWeight: 700,
        textDecoration: 'none',
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        rotate: '-45deg',
      }}
    >
      <span style={{ rotate: '45deg' }}>{index}</span>
    </Link>
  );
}
