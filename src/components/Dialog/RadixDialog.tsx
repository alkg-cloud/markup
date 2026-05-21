'use client';

/**
 * `RadixDialog` — thin wrapper around `@radix-ui/react-dialog`.
 *
 * Replaces the legacy `Dialog.tsx` primitive with a Radix-backed compound
 * component that brings focus trap, scroll lock, portal mounting, and ARIA
 * wiring for free. The visual contract (glass scrim + dialog body radius,
 * padding, animation) is preserved verbatim by porting `Dialog.module.css`
 * into `RadixDialog.module.css` — see that file's header for the design
 * lineage.
 *
 * Compound shape mirrors the Radix surface so consumers stay close to the
 * upstream API:
 *
 *   <RadixDialog.Root open … onOpenChange=…>
 *     <RadixDialog.Trigger asChild>…</RadixDialog.Trigger>
 *     <RadixDialog.Portal>
 *       <RadixDialog.Overlay />
 *       <RadixDialog.Content>
 *         <RadixDialog.Title>…</RadixDialog.Title>
 *         <RadixDialog.Description>…</RadixDialog.Description>
 *         …
 *         <RadixDialog.Close asChild>…</RadixDialog.Close>
 *       </RadixDialog.Content>
 *     </RadixDialog.Portal>
 *   </RadixDialog.Root>
 *
 * Only `Overlay`, `Content`, `Title`, and `Description` carry our class
 * names; the structural primitives (`Root`, `Trigger`, `Portal`, `Close`)
 * are re-exported as-is.
 */

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import styles from './RadixDialog.module.css';

const Root = DialogPrimitive.Root;
const Trigger = DialogPrimitive.Trigger;
const Portal = DialogPrimitive.Portal;
const Close = DialogPrimitive.Close;

const Overlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} className={cn(styles.scrim, className)} {...props} />
));
Overlay.displayName = 'RadixDialog.Overlay';

/** Inline close-X glyph — same path as NewMockupDialog's local CloseGlyph. */
function DialogCloseGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.708.708L7.293 8l-3.647 3.646.708.708L8 8.707z" />
    </svg>
  );
}

type ContentOwnProps = {
  /**
   * When true, renders a 24×24 close-X button (absolutely positioned at
   * top-right) as part of the dialog primitive. Default: false.
   * See docs/design/design-system/14-dialog.html § closable-via-x.
   */
  showCloseButton?: boolean;
  /**
   * Accessible label for the close-X button. Default: "Close".
   * Pass a locale-specific value when needed.
   */
  closeLabel?: string;
  /**
   * When true, grays out the X (opacity 0.4, cursor: not-allowed).
   * Pass `closeButtonDisabled={isSubmitting}` to match the disabled state
   * of Cancel and the primary action during in-flight submits.
   * Escape and scrim-click remain armed at the Radix layer.
   */
  closeButtonDisabled?: boolean;
};

const Content = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, keyof ContentOwnProps> &
    ContentOwnProps
>(
  (
    {
      className,
      children,
      showCloseButton = false,
      closeLabel = 'Close',
      closeButtonDisabled = false,
      ...props
    },
    ref,
  ) => (
    <DialogPrimitive.Content ref={ref} className={cn(styles.dialog, className)} {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close
          className={styles.closeBtn}
          aria-label={closeLabel}
          disabled={closeButtonDisabled}
        >
          <DialogCloseGlyph />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  ),
);
Content.displayName = 'RadixDialog.Content';

const Title = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn(styles.title, className)} {...props} />
));
Title.displayName = 'RadixDialog.Title';

const Description = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn(styles.description, className)} {...props} />
));
Description.displayName = 'RadixDialog.Description';

export const RadixDialog = {
  Root,
  Trigger,
  Portal,
  Close,
  Overlay,
  Content,
  Title,
  Description,
};
