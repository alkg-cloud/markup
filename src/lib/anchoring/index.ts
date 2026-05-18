export { buildAnchorPath, resolveAnchor } from './path';
export { buildAnchorFromClick, type ClickAnchorInput } from './click';
export {
  findCharPositionInElement,
  getCharOffsetInElement,
  type CharPosition,
} from './text';
export {
  type Anchor,
  type ElementAnchor,
  type TextAnchor,
  PIN_HALF,
  PIN_SIZE,
  PIN_TIP_OFFSET_Y,
  applyPinPosition,
  computePinTarget,
  getCharRect,
  isTextAnchor,
} from './reposition';
export {
  type UseAnchoredPinsApi,
  type UseAnchoredPinsOptions,
  useAnchoredPins,
} from './useAnchoredPins';
