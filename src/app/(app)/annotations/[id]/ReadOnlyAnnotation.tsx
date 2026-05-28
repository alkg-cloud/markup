'use client';

interface Props {
  screenshotUrl: string;
  width: number;
  height: number;
}

export function ReadOnlyAnnotation({ screenshotUrl, width, height }: Props) {
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: width && height ? `${width} / ${height}` : 'auto',
        width: '100%',
      }}
    >
      <img
        src={screenshotUrl}
        alt="annotation screenshot"
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
      />
    </div>
  );
}
