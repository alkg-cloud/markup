import React, { useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AssetRecordType, createShapeId, Tldraw } from '@tldraw/tldraw';

const h = React.createElement;
const intentKinds = ['visual', 'copy', 'behavior', 'other'];
const initialVariant = window.MARKUP_IDEA_VARIANT || 'viewer-shell';
const versions = [
  { id: 'cmv_04_current', label: 'v4', createdAt: '2026-05-15 01:18', by: 'designer-bot', note: 'Hero spacing + primary CTA alignment' },
  { id: 'cmv_03', label: 'v3', createdAt: '2026-05-14 22:41', by: 'acamillo', note: 'Added coffee product module' },
  { id: 'cmv_02', label: 'v2', createdAt: '2026-05-14 19:08', by: 'designer-bot', note: 'Mobile nav treatment' },
  { id: 'cmv_01', label: 'v1', createdAt: '2026-05-14 17:33', by: 'acamillo', note: 'Initial upload' },
];
const annotations = [
  { id: 'cma_01', number: 1, intentType: 'visual', status: 'open', createdAt: '01:22', version: 'v4', messageCount: 3, title: 'Hero H1 overlaps visual weight', preview: 'Reduce H1 width or shift product block 24px right.', x: 43, y: 35 },
  { id: 'cma_02', number: 2, intentType: 'behavior', status: 'open', createdAt: '00:58', version: 'v4', messageCount: 2, title: 'CTA hit area smaller than visual button', preview: 'Button hover target should match visible pill.', x: 67, y: 61 },
  { id: 'cma_03', number: 3, intentType: 'copy', status: 'resolved', createdAt: 'yesterday', version: 'v3', messageCount: 5, title: 'Support copy reads generic', preview: 'Resolved in v4 by tightening the product promise.', x: 31, y: 49 },
];
function svgDataUrl(label = 'Captured mockup screenshot') {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="760" viewBox="0 0 1280 760"><rect width="1280" height="760" fill="#f7f3ea"/><rect y="0" width="1280" height="72" fill="#eee5d6"/><text x="54" y="45" font-family="Manrope,Arial" font-size="16" font-weight="800" fill="#17201d" letter-spacing="4">LUMEN</text><text x="1040" y="45" font-family="Manrope,Arial" font-size="13" fill="#4b554f">Beans  Brew guides  About</text><text x="54" y="205" font-family="Georgia" font-size="82" font-weight="700" fill="#151a17">Coffee that makes</text><text x="54" y="290" font-family="Georgia" font-size="82" font-weight="700" fill="#151a17">launches calmer.</text><text x="58" y="340" font-family="Manrope,Arial" font-size="22" fill="#4b554f">A warm product page captured from /m/cmk_hero_v4/.</text><rect x="800" y="140" width="360" height="430" rx="5" fill="#17231f"/><path d="M800 340H1160V570H800Z" fill="#a06b42"/><path d="M924 140H1160V570H924Z" fill="#e7d4b8" opacity=".9"/><rect x="54" y="505" width="300" height="150" rx="4" fill="#fffaf1" stroke="#ded2bf"/><rect x="384" y="505" width="300" height="150" rx="4" fill="#fffaf1" stroke="#ded2bf"/><rect x="714" y="505" width="300" height="150" rx="4" fill="#fffaf1" stroke="#ded2bf"/><text x="54" y="724" font-family="JetBrains Mono,monospace" font-size="15" fill="#69756f">' + label + '</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
function TldrawCanvas({ mode = 'edit', label = 'Captured screenshot' }) {
  const backgroundUrl = useMemo(() => svgDataUrl(label), [label]);
  const handleMount = useCallback((editor) => {
    const existing = editor.getAssets().find((a) => a.type === 'image' && a.props.name === 'screenshot');
    if (!existing) {
      const assetId = AssetRecordType.createId();
      editor.createAssets([{ id: assetId, type: 'image', typeName: 'asset', props: { name: 'screenshot', src: backgroundUrl, w: 1280, h: 760, mimeType: 'image/svg+xml', isAnimated: false }, meta: { locked: true, externalRef: 'screenshot' } }]);
      editor.createShapes([{ id: createShapeId(), type: 'image', x: 0, y: 0, isLocked: true, props: { assetId, w: 1280, h: 760, playing: false, url: '', crop: null, flipX: false, flipY: false, altText: 'Captured mockup screenshot' } }]);
    }
    editor.updateInstanceState({ isReadonly: mode === 'readonly' });
  }, [backgroundUrl, mode]);
  return h('div', { className: 'tl-host' }, h(Tldraw, { onMount: handleMount, hideUi: true }));
}
function Sidebar() { return h('aside', { className: 'project-sidebar' }, h('div', { className: 'sidebar-brand' }, h('div', { className: 'brand-mark' }), h('div', { className: 'brand-copy' }, h('span', { className: 'brand-name' }, 'Markup'), h('span', { className: 'brand-sub' }, 'Markup dev'))), h('div', { className: 'tree' }, h('div', { className: 'tree-label' }, 'Projetos'), h('div', { className: 'tree-row' }, h('span', { className: 'tree-icon' }, '▾'), 'Markup dev'), h('div', { className: 'tree-row depth-1' }, h('span', { className: 'tree-icon' }, '▸'), 'Design System'), h('div', { className: 'tree-row depth-1 active' }, h('span', { className: 'tree-icon' }, '▾'), 'Ideias'), h('div', { className: 'tree-row depth-2 active' }, h('span', { className: 'tree-icon' }, '◧'), 'mockup-view-comment'), h('div', { className: 'tree-label' }, 'Recentes'), h('div', { className: 'tree-row muted' }, 'full-prototype'), h('div', { className: 'tree-row muted' }, '11-mockup-view')), h('div', { className: 'sidebar-footer' }, h('button', { className: 'btn-ghost' }, 'New project'), h('button', { className: 'btn' }, 'Upload mockup'))); }
function Topbar({ setScreen, openComment }) { return h('header', { className: 'topbar' }, h('div', { className: 'topbar-left' }, h('span', { className: 'back-link' }, '← Projects'), h('span', { className: 'divider' }), h('span', { className: 'mockup-title' }, 'landing-hero-v4.html'), h('span', { className: 'pill current' }, 'v4 · current'), h('span', { className: 'pill open' }, 'open')), h('div', { className: 'topbar-right' }, h('button', { className: 'btn-ghost', onClick: () => setScreen('versions') }, 'Versions'), h('button', { className: 'btn-ghost', onClick: () => setScreen('detail') }, 'Annotations'), h('button', { className: 'btn', onClick: openComment }, '+ Comment'))); }
function RenderedMockup({ setScreen }) { return h('main', { className: 'mockup-stage' }, h('div', { className: 'iframe-card' }, h('div', { className: 'rendered-page' }, h('div', { className: 'rendered-nav' }, h('span', null, 'LUMEN'), h('span', null, 'Beans  Brew guides  About')), h('section', { className: 'rendered-hero' }, h('div', null, h('h1', null, 'Coffee that makes launches calmer.'), h('p', null, 'A warm product page served from the current MockupVersion. Pins use persisted pinCoords from annotations created on v4.')), h('div', { className: 'rendered-art' })), h('section', { className: 'rendered-grid' }, ['Roast profile', 'Launch ritual', 'Team delivery'].map((t) => h('article', { className: 'rendered-card', key: t }, h('b', null, t), h('p', null, 'Card content remains inside the iframe; annotation pins are overlaid by the viewer.')))))), h('div', { className: 'pin-layer' }, annotations.map((a) => h('button', { key: a.id, className: 'pin-link', style: { left: a.x + '%', top: a.y + '%' }, onClick: () => setScreen('detail') }, h('span', { className: 'pin-drop ' + (a.status === 'resolved' ? 'resolved' : '') }, h('span', null, a.number)))))); }
function ViewerSidebar({ selected, setSelected, setScreen }) {
  const annotationItems = annotations.map((a) => h('li', { key: a.id },
    h('button', {
      className: 'annotation-row ' + (selected === a.id ? 'active' : ''),
      onClick: () => { setSelected(a.id); setScreen('detail'); }
    },
      h('span', { className: 'row-meta' },
        h('span', null, a.createdAt + ' · ' + a.version),
        h('span', { className: 'pill ' + a.status }, a.status)
      ),
      h('span', { className: 'row-title' }, '#' + a.number + ' ' + a.title),
      h('span', { className: 'row-sub' }, a.messageCount + ' messages · ' + a.preview),
      h('span', { className: 'pill ' + a.intentType }, a.intentType)
    )
  ));
  const versionItems = versions.map((v, i) => h('li', { key: v.id },
    h('button', { className: 'version-row ' + (i === 0 ? 'active' : ''), onClick: () => setScreen('versions') },
      h('span', { className: 'row-meta' },
        h('span', null, v.createdAt),
        i === 0 ? h('span', { className: 'pill current' }, 'current') : null
      ),
      h('span', { className: 'row-title' }, v.label + ' · ' + v.note),
      h('span', { className: 'row-sub' }, 'createdByType=agent · ' + v.by)
    )
  ));
  return h('aside', { className: 'viewer-sidebar' },
    h('div', { className: 'section-head' }, h('span', { className: 'eyebrow' }, 'Annotations'), h('span', { className: 'count' }, annotations.length)),
    h('ul', { className: 'annotation-list' }, annotationItems),
    h('div', { className: 'section-head' }, h('span', { className: 'eyebrow' }, 'Versions'), h('span', { className: 'count' }, versions.length)),
    h('ul', { className: 'version-list' }, versionItems)
  );
}
function ViewerScreen({ selected, setSelected, setScreen }) { return h('div', { className: 'viewer-grid' }, h(ViewerSidebar, { selected, setSelected, setScreen }), h(RenderedMockup, { setScreen })); }
function AnnotationDialog({ onClose, setScreen }) { const [intent, setIntent] = useState('visual'); return h('div', { className: 'modal-scrim', onMouseDown: onClose }, h('section', { className: 'annotation-dialog', role: 'dialog', 'aria-modal': 'true', onMouseDown: (e) => e.stopPropagation() }, h('div', { className: 'dialog-head' }, h('div', null, h('h2', { className: 'dialog-title' }, 'Create annotation'), h('p', { className: 'dialog-sub' }, 'POST /api/mockups/cmk_hero/annotations · screenshot + tldraw + message + intent_type + pinCoords')), h('button', { className: 'icon-btn', onClick: onClose }, '×')), h('div', { className: 'canvas-frame' }, h(TldrawCanvas, { mode: 'edit', label: 'AnnotationModal screenshot capture' })), h('div', { className: 'intent-strip', role: 'radiogroup', 'aria-label': 'intent type' }, intentKinds.map((kind) => h('button', { key: kind, className: 'intent-chip ' + (intent === kind ? 'active' : ''), onClick: () => setIntent(kind), role: 'radio', 'aria-checked': intent === kind }, kind))), h('textarea', { className: 'comment-input', defaultValue: 'The H1 and product block compete for priority. Please narrow the text column or shift the image 24px right.', placeholder: "What's wrong / what to change?" }), h('div', { className: 'dialog-actions' }, h('button', { className: 'btn-ghost', onClick: onClose }, 'Cancel'), h('button', { className: 'btn', onClick: () => { onClose(); setScreen('detail'); } }, 'Save annotation →')))); }
function VersionsScreen() {
  const panes = ['v3 · base', 'v4 · current'].map((title, index) =>
    h('article', { className: 'compare-pane', key: title },
      h('div', { className: 'compare-head' },
        h('b', null, title),
        index ? h('span', { className: 'pill current' }, 'current') : h('span', { className: 'pill' }, 'base')
      ),
      h('div', { className: 'mini-page' },
        h('span', { className: 'pill ' + (index ? 'visual' : 'other') }, index ? 'after' : 'before'),
        h('h2', null, index ? 'Coffee that makes launches calmer.' : 'Coffee for careful teams.'),
        h('p', null, index ? 'Updated hero copy and right-side product art. Existing annotations remain tied to createdOnVersionId.' : 'Earlier copy used before designer-bot patch.'),
        h('div', { className: 'mini-block' })
      )
    )
  );
  const versionRows = versions.map((v, i) =>
    h('li', { key: v.id },
      h('button', { className: 'version-row ' + (i === 0 ? 'active' : '') },
        h('span', { className: 'row-meta' },
          h('span', null, v.createdAt),
          i === 0 ? h('span', { className: 'pill current' }, 'current') : h('span', { className: 'pill' }, 'promote')
        ),
        h('span', { className: 'row-title' }, v.label + ' · ' + v.note),
        h('span', { className: 'row-sub' }, 'MockupVersion.id=' + v.id + ' · createdBy=' + v.by)
      )
    )
  );
  return h('section', { className: 'versions-view' },
    h('div', { className: 'compare' }, panes),
    h('aside', { className: 'version-inspector' },
      h('div', { className: 'section-head' }, h('span', { className: 'eyebrow' }, 'Version history'), h('span', { className: 'count' }, '4')),
      h('ul', { className: 'version-list' }, versionRows),
      h('div', { className: 'section-head' }, h('span', { className: 'eyebrow' }, 'Text diff')),
      h('div', { className: 'diff-line remove' }, h('span', null, '-'), h('span', null, 'Coffee for careful teams.')),
      h('div', { className: 'diff-line add' }, h('span', null, '+'), h('span', null, 'Coffee that makes launches calmer.'))
    )
  );
}
function DetailScreen({ selected }) { const active = annotations.find((a) => a.id === selected) || annotations[0]; const [editable, setEditable] = useState(initialVariant === 'annotation-detail'); return h('section', { className: 'detail-view' }, h('main', { className: 'detail-main' }, h('div', { className: 'dialog-head' }, h('div', null, h('h2', { className: 'dialog-title' }, 'Annotation #' + active.number), h('p', { className: 'dialog-sub' }, 'GET /annotations/' + active.id + ' · createdOnVersionId=cmv_04_current · intentType=' + active.intentType)), h('div', { style: { display: 'flex', gap: '8px' } }, h('button', { className: 'btn-ghost', onClick: () => setEditable(!editable) }, editable ? 'Read only' : 'Edit drawings'), editable ? h('button', { className: 'btn' }, 'Save') : null)), h('div', { className: 'canvas-frame large' }, h(TldrawCanvas, { mode: editable ? 'edit' : 'readonly', label: 'ReadOnlyAnnotation screenshot + persisted tldraw' }))), h('aside', { className: 'thread-panel' }, h('div', { className: 'thread-head' }, h('span', { className: 'pill ' + active.intentType }, active.intentType), h('b', null, active.title), h('span', { className: 'row-sub' }, active.preview)), h('div', { className: 'thread-list' }, [['AG', 'acamillo.goncalves', active.preview], ['DB', 'designer-bot', 'Context loaded via /api/agent/context/' + active.id + '. Suggested patch should update the hero layout while preserving v4 assets.'], ['AG', 'acamillo.goncalves', 'Looks right. Keep the annotation open until the next version is uploaded.']].map((m, i) => h('div', { className: 'message', key: i }, h('div', { className: 'avatar' }, m[0]), h('div', { className: 'bubble' }, h('div', { className: 'bubble-head' }, h('span', null, m[1]), h('time', null, i ? i + 'm' : 'now')), h('div', { className: 'bubble-body' }, m[2]))))), h('div', { className: 'reply-box' }, h('textarea', { className: 'comment-input', defaultValue: 'Reply with implementation notes or resolve after uploading a corrected version.' }), h('button', { className: 'btn' }, 'Reply')))); }
function CreateRouteScreen({ setScreen }) { const [intent, setIntent] = useState('visual'); return h('section', { className: 'create-page' }, h('main', { className: 'create-left' }, h('div', { className: 'capture-meta' }, [['scrollX','0'],['scrollY','184'],['viewport','1280×760'],['bbox','512,218 260×94']].map((m) => h('div', { className: 'metric', key: m[0] }, h('div', { className: 'metric-label' }, m[0]), h('div', { className: 'metric-value' }, m[1])))), h('div', { className: 'canvas-frame large' }, h(TldrawCanvas, { mode: 'edit', label: 'Full page create annotation route' }))), h('aside', { className: 'create-side' }, h('div', null, h('h2', { className: 'dialog-title' }, 'New annotation'), h('p', { className: 'dialog-sub' }, 'Route-style creation surface after pressing + Comment.')), h('div', { className: 'intent-strip' }, intentKinds.map((kind) => h('button', { key: kind, className: 'intent-chip ' + (intent === kind ? 'active' : ''), onClick: () => setIntent(kind) }, kind))), h('textarea', { className: 'comment-input', defaultValue: 'Change the hero balance: text column should not exceed 560px and product image should align to the top of the headline.' }), h('div', { className: 'payload-card' }, h('pre', null, JSON.stringify({ mockupId: 'cmk_hero', screenshot: 'screenshot.png', tldraw: 'TLEditorSnapshot', intent_type: intent, pinCoords: { scrollX: 0, scrollY: 184, viewportWidth: 1280, viewportHeight: 760, bboxX: 512, bboxY: 218, bboxW: 260, bboxH: 94 } }, null, 2))), h('div', { className: 'dialog-actions' }, h('button', { className: 'btn-ghost', onClick: () => setScreen('viewer') }, 'Cancel'), h('button', { className: 'btn', onClick: () => setScreen('detail') }, 'Save annotation →')))); }
function App() { const initialScreen = initialVariant === 'versions-review' ? 'versions' : initialVariant === 'annotation-detail' ? 'detail' : initialVariant === 'create-route' ? 'create' : 'viewer'; const [screen, setScreen] = useState(initialScreen); const [selected, setSelected] = useState('cma_01'); const [modalOpen, setModalOpen] = useState(false); const openComment = () => initialVariant === 'create-route' ? setScreen('create') : setModalOpen(true); return h('div', { className: 'app-shell' }, h('div', { className: 'workspace' }, h(Topbar, { setScreen, openComment }), screen === 'viewer' ? h(ViewerScreen, { selected, setSelected, setScreen }) : screen === 'versions' ? h(VersionsScreen) : screen === 'detail' ? h(DetailScreen, { selected }) : h(CreateRouteScreen, { setScreen })), modalOpen ? h(AnnotationDialog, { onClose: () => setModalOpen(false), setScreen }) : null); }
createRoot(document.getElementById('root')).render(h(App));
