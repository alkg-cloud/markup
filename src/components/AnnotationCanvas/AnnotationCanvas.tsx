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
  /** When provided, mounts in read-only mode and replays this snapshot. */
  snapshot?: TLEditorSnapshot;
  /** When provided, mounts editable; the parent receives the `Editor` ref. */
  onEditorMount?: (editor: Editor) => void;
}

export function AnnotationCanvas({ backgroundUrl, width, height, snapshot, onEditorMount }: Props) {
  const handleMount = useCallback(
    (editor: Editor) => {
      if (snapshot) {
        editor.loadSnapshot(snapshot);
        editor.updateInstanceState({ isReadonly: true });
      } else {
        // Insert the screenshot as a locked image asset filling a fixed-size frame.
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
    [backgroundUrl, width, height, snapshot, onEditorMount],
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '70vh' }}>
      <Tldraw onMount={handleMount} hideUi={Boolean(snapshot)} />
    </div>
  );
}
