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
import {
  type ComponentPropsWithoutRef,
  type ElementRef,
  forwardRef,
} from 'react';
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

const Content = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Content ref={ref} className={cn(styles.dialog, className)} {...props} />
));
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
