'use client';
import {
  AssetRecordType,
  createShapeId,
  type Editor,
  type TLEditorSnapshot,
  Tldraw,
} from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useCallback } from 'react';

interface Props {
  /** Data URL or absolute URL of the screenshot to lock as the background. */
  backgroundUrl: string;
  /** Intrinsic size of the screenshot, used to size the locked image shape. */
  width: number;
  height: number;
  /** When provided, replays this snapshot. Read-only by default; pass `editable` to allow edits. */
  snapshot?: TLEditorSnapshot;
  /** When mounting with a snapshot, allow further edits instead of locking the editor. */
  editable?: boolean;
  /** When provided, mounts editable; the parent receives the `Editor` ref. */
  onEditorMount?: (editor: Editor) => void;
}

export function AnnotationCanvas({
  backgroundUrl,
  width,
  height,
  snapshot,
  editable,
  onEditorMount,
}: Props) {
  const handleMount = useCallback(
    (editor: Editor) => {
      if (snapshot) {
        editor.loadSnapshot(snapshot);
        editor.updateInstanceState({ isReadonly: !editable });
      } else {
        // React StrictMode (dev) fires onMount twice. Skip the second invocation
        // by checking whether the screenshot asset is already on the editor.
        const existing = editor
          .getAssets()
          .find((a) => a.type === 'image' && a.props.name === 'screenshot');
        if (existing) return;

        const assetId = AssetRecordType.createId();
        editor.createAssets([
          {
            id: assetId,
            type: 'image',
            typeName: 'asset',
            props: {
              name: 'screenshot',
              src: backgroundUrl,
              w: width,
              h: height,
              mimeType: 'image/png',
              isAnimated: false,
            },
            meta: { locked: true },
          },
        ]);
        const shapeId = createShapeId();
        editor.createShapes([
          {
            id: shapeId,
            type: 'image',
            x: 0,
            y: 0,
            isLocked: true,
            props: {
              assetId,
              w: width,
              h: height,
              playing: false,
              url: '',
              crop: null,
              flipX: false,
              flipY: false,
              altText: '',
            },
          },
        ]);
      }
      onEditorMount?.(editor);
    },
    [backgroundUrl, width, height, snapshot, editable, onEditorMount],
  );

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      <Tldraw onMount={handleMount} hideUi={Boolean(snapshot) && !editable} />
    </div>
  );
}
