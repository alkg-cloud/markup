export { buildAnchorFromClick, type ClickAnchorInput } from './click';
export { buildAnchorPath, resolveAnchor } from './path';
export {
  type Anchor,
  applyPinPosition,
  computePinTarget,
  type ElementAnchor,
  getCharRect,
  isTextAnchor,
  PIN_HALF,
  PIN_SIZE,
  PIN_TIP_OFFSET_Y,
  type TextAnchor,
} from './reposition';
export {
  type CharPosition,
  findCharPositionInElement,
  getCharOffsetInElement,
} from './text';
export {
  type UseAnchoredPinsApi,
  type UseAnchoredPinsOptions,
  useAnchoredPins,
} from './useAnchoredPins';
