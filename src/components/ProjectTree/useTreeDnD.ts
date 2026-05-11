'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface DnDNode {
  id: string;
  type: 'project' | 'folder' | 'mockup' | 'recents-header' | 'recents-item';
  parentId: string | null;
  level: number;
  projectId: string;
  expandable: boolean;
}

export type DropPosition = 'before' | 'after' | 'inside';

export interface DropTarget {
  nodeId: string;
  position: DropPosition;
}

export interface DragState {
  draggingId: string | null;
  dropTarget: DropTarget | null;
  isInvalid: boolean;
  kbMoveMode: boolean;
  kbOriginalIndex: number | null;
}

const INITIAL_STATE: DragState = {
  draggingId: null,
  dropTarget: null,
  isInvalid: false,
  kbMoveMode: false,
  kbOriginalIndex: null,
};

interface UseTreeDnDOpts {
  nodes: DnDNode[];
  getDescendantIds: (folderId: string) => Set<string>;
  getNodeDepth: (nodeId: string) => number;
  getSubtreeDepth: (nodeId: string) => number;
  maxDepth: number;
  onToggleExpand: (nodeId: string) => void;
  onMove: (
    dragId: string,
    dragType: 'folder' | 'mockup',
    targetParentId: string | null,
    targetProjectId: string,
    position: number,
  ) => Promise<void>;
  announceRef: React.RefObject<HTMLDivElement | null>;
}

export function useTreeDnD(opts: UseTreeDnDOpts) {
  const {
    nodes,
    getDescendantIds,
    getNodeDepth,
    getSubtreeDepth,
    maxDepth,
    onToggleExpand,
    onMove,
    announceRef,
  } = opts;

  const [state, setState] = useState<DragState>(INITIAL_STATE);
  const autoExpandTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const announce = useCallback(
    (msg: string) => {
      if (announceRef.current) {
        announceRef.current.textContent = '';
        requestAnimationFrame(() => {
          if (announceRef.current) announceRef.current.textContent = msg;
        });
      }
    },
    [announceRef],
  );

  const isDraggable = useCallback(
    (node: DnDNode) => node.type === 'folder' || node.type === 'mockup',
    [],
  );

  const isValidDrop = useCallback(
    (dragNode: DnDNode, targetNode: DnDNode, position: DropPosition): boolean => {
      if (targetNode.type === 'recents-header' || targetNode.type === 'recents-item') return false;
      if (targetNode.type === 'project' && position === 'inside') return true;
      if (targetNode.id === dragNode.id) return false;
      if (dragNode.type === 'folder') {
        const descendants = getDescendantIds(dragNode.id);
        if (descendants.has(targetNode.id)) return false;
      }
      if (position === 'inside' && targetNode.type === 'folder' && dragNode.type === 'folder') {
        const targetDepth = getNodeDepth(targetNode.id);
        const dragSubtree = getSubtreeDepth(dragNode.id);
        if (targetDepth + 1 + dragSubtree > maxDepth) return false;
      }
      return true;
    },
    [getDescendantIds, getNodeDepth, getSubtreeDepth, maxDepth],
  );

  // --- Mouse DnD via HTML5 Drag API ---

  const handleDragStart = useCallback(
    (e: React.DragEvent, node: DnDNode) => {
      if (!isDraggable(node)) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', node.id);

      const el = e.currentTarget as HTMLElement;
      const ghost = el.cloneNode(true) as HTMLElement;
      ghost.style.opacity = '0.6';
      ghost.style.position = 'absolute';
      ghost.style.top = '-9999px';
      ghost.style.width = `${el.offsetWidth}px`;
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 14);
      requestAnimationFrame(() => ghost.remove());

      setState((prev) => ({ ...prev, draggingId: node.id }));
    },
    [isDraggable],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, node: DnDNode) => {
      e.preventDefault();
      if (!state.draggingId) return;

      const dragNode = nodes.find((n) => n.id === state.draggingId);
      if (!dragNode) return;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      const ratio = y / rect.height;

      let position: DropPosition;
      if (node.expandable && ratio > 0.25 && ratio < 0.75) {
        position = 'inside';
      } else if (ratio < 0.5) {
        position = 'before';
      } else {
        position = 'after';
      }

      const valid = isValidDrop(dragNode, node, position);
      e.dataTransfer.dropEffect = valid ? 'move' : 'none';

      setState((prev) => ({
        ...prev,
        dropTarget: { nodeId: node.id, position },
        isInvalid: !valid,
      }));

      if (valid && position === 'inside' && node.expandable) {
        if (autoExpandTimer.current) clearTimeout(autoExpandTimer.current);
        autoExpandTimer.current = setTimeout(() => {
          onToggleExpand(node.id);
        }, 600);
      }
    },
    [state.draggingId, nodes, isValidDrop, onToggleExpand],
  );

  const handleDragLeave = useCallback(() => {
    if (autoExpandTimer.current) {
      clearTimeout(autoExpandTimer.current);
      autoExpandTimer.current = null;
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, node: DnDNode) => {
      e.preventDefault();
      if (autoExpandTimer.current) clearTimeout(autoExpandTimer.current);

      const dragNode = nodes.find((n) => n.id === state.draggingId);
      if (!dragNode || !state.dropTarget) {
        setState(INITIAL_STATE);
        return;
      }

      if (state.isInvalid) {
        announce('Movimento cancelado');
        setState(INITIAL_STATE);
        return;
      }

      const { position } = state.dropTarget;
      let targetParentId: string | null;
      let targetProjectId: string;
      let insertPosition: number;

      if (position === 'inside') {
        targetParentId = node.type === 'project' ? null : node.id;
        targetProjectId = node.projectId;
        insertPosition = 0;
      } else {
        targetParentId = node.parentId;
        targetProjectId = node.projectId;
        const siblings = nodes.filter(
          (n) => n.parentId === node.parentId && n.id !== dragNode.id && isDraggable(n),
        );
        const targetIdx = siblings.findIndex((n) => n.id === node.id);
        insertPosition = position === 'before' ? targetIdx : targetIdx + 1;
        if (insertPosition < 0) insertPosition = 0;
      }

      try {
        await onMove(
          dragNode.id,
          dragNode.type as 'folder' | 'mockup',
          targetParentId,
          targetProjectId,
          Math.max(0, insertPosition),
        );
        const targetLabel =
          position === 'inside'
            ? nodes.find((n) => n.id === node.id)?.type === 'project'
              ? 'raiz do projeto'
              : node.id
            : `posição ${insertPosition + 1}`;
        announce(`Item movido para ${targetLabel}`);
      } catch {
        announce('Erro ao mover item');
      }

      setState(INITIAL_STATE);
    },
    [state.draggingId, state.dropTarget, state.isInvalid, nodes, isDraggable, onMove, announce],
  );

  const handleDragEnd = useCallback(() => {
    if (autoExpandTimer.current) clearTimeout(autoExpandTimer.current);
    setState(INITIAL_STATE);
  }, []);

  // --- Keyboard DnD ---

  const startKbMove = useCallback(
    (nodeIndex: number) => {
      const node = nodes[nodeIndex];
      if (!node || !isDraggable(node)) return false;
      setState({
        draggingId: node.id,
        dropTarget: null,
        isInvalid: false,
        kbMoveMode: true,
        kbOriginalIndex: nodeIndex,
      });
      announce(
        `Modo de movimento ativado para ${node.id}. Use setas para mover, Enter para confirmar, Escape para cancelar.`,
      );
      return true;
    },
    [nodes, isDraggable, announce],
  );

  const cancelKbMove = useCallback(() => {
    setState(INITIAL_STATE);
    announce('Movimento cancelado');
  }, [announce]);

  const confirmKbMove = useCallback(
    async (currentIndex: number) => {
      const dragNode = nodes.find((n) => n.id === state.draggingId);
      if (!dragNode) {
        setState(INITIAL_STATE);
        return;
      }

      const targetNode = nodes[currentIndex];
      if (!targetNode || !isValidDrop(dragNode, targetNode, 'after')) {
        announce('Posição inválida');
        return;
      }

      const targetParentId = targetNode.parentId;
      const targetProjectId = targetNode.projectId;
      const siblings = nodes.filter(
        (n) => n.parentId === targetParentId && n.id !== dragNode.id && isDraggable(n),
      );
      const targetIdx = siblings.findIndex((n) => n.id === targetNode.id);
      const insertPosition = Math.max(0, targetIdx + 1);

      try {
        await onMove(
          dragNode.id,
          dragNode.type as 'folder' | 'mockup',
          targetParentId,
          targetProjectId,
          insertPosition,
        );
        announce(`Item movido para posição ${insertPosition + 1}`);
      } catch {
        announce('Erro ao mover item');
      }

      setState(INITIAL_STATE);
    },
    [state.draggingId, nodes, isValidDrop, isDraggable, onMove, announce],
  );

  useEffect(() => {
    return () => {
      if (autoExpandTimer.current) clearTimeout(autoExpandTimer.current);
    };
  }, []);

  const getDropIndicatorStyle = useCallback(
    (nodeId: string): React.CSSProperties | null => {
      if (!state.dropTarget || state.isInvalid || state.dropTarget.nodeId !== nodeId) return null;

      const { position } = state.dropTarget;
      if (position === 'inside') {
        return {
          outline: '2px solid var(--accent)',
          outlineOffset: -2,
          borderRadius: 'var(--radius-xs)',
        };
      }
      return {};
    },
    [state.dropTarget, state.isInvalid],
  );

  const getDropLinePosition = useCallback(
    (nodeId: string): 'before' | 'after' | null => {
      if (!state.dropTarget || state.isInvalid || state.dropTarget.nodeId !== nodeId) return null;
      const { position } = state.dropTarget;
      if (position === 'before' || position === 'after') return position;
      return null;
    },
    [state.dropTarget, state.isInvalid],
  );

  return {
    dragState: state,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    startKbMove,
    cancelKbMove,
    confirmKbMove,
    isDraggable,
    getDropIndicatorStyle,
    getDropLinePosition,
  };
}
