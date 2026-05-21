'use client';

/**
 * `InputField` — DS 28 compound primitive built on `@radix-ui/react-form`.
 *
 * Compound shape:
 *
 *   <Form.Root>
 *     <InputField.Root name="…" data-state={serverState} hasTrailingIcon>
 *       <InputField.Label>Name</InputField.Label>
 *       <InputField.Control asChild><input … /></InputField.Control>
 *       <InputField.Message match="valueMissing">A name is required.</InputField.Message>
 *       <InputField.Help>Lowercase letters, numbers, or hyphens.</InputField.Help>
 *     </InputField.Root>
 *   </Form.Root>
 *
 * State driving:
 *   - Radix Form auto-stamps `[data-invalid]` on the Field when the embedded
 *     input's ValidityState fails any matcher. Our CSS hooks both selectors
 *     (`[data-state="error"]` AND `[data-invalid]`) so sync (Radix) and async/
 *     server (consumer-set) error paths share the same visual.
 *   - Consumers set `data-state="error"` for server-side errors (e.g., 409
 *     duplicate-name responses) and `data-state="success"` for affirmative
 *     async confirmations (name available, code redeemed).
 *   - Resting "valid" (Radix `[data-valid]` with no `[data-state]`) renders
 *     no visual — green-on-every-pristine-input is noise.
 *
 * `Control` and `Message` are re-exported directly from Radix; `Root` and
 * `Label` carry our class names; `Help` is a non-Radix slot for the resting
 * help line (the same DOM position as `.help` for error/success).
 *
 * See `docs/design/design-system/28-input-field.html` for the visual
 * contract — `InputField.module.css` is a verbatim port of its style block.
 */

import * as Form from '@radix-ui/react-form';
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from 'react';
import styles from './InputField.module.css';

function cn(...names: Array<string | undefined | false | null>): string {
  return names.filter(Boolean).join(' ');
}

type RootProps = ComponentPropsWithoutRef<typeof Form.Field> & {
  /** Server-side state hook. Radix Form's `[data-invalid]` handles sync. */
  'data-state'?: 'error' | 'success';
  /** Layout modifier: reserves left padding for a leading icon. */
  hasLeadingIcon?: boolean;
  /** Layout modifier: reserves right padding for a trailing icon. */
  hasTrailingIcon?: boolean;
};

const Root = forwardRef<ElementRef<typeof Form.Field>, RootProps>(
  ({ className, hasLeadingIcon, hasTrailingIcon, ...props }, ref) => (
    <Form.Field
      ref={ref}
      className={cn(
        styles.field,
        hasLeadingIcon && styles.hasLeadingIcon,
        hasTrailingIcon && styles.hasTrailingIcon,
        className,
      )}
      {...props}
    />
  ),
);
Root.displayName = 'InputField.Root';

const Label = forwardRef<
  ElementRef<typeof Form.Label>,
  ComponentPropsWithoutRef<typeof Form.Label>
>(({ className, ...props }, ref) => (
  <Form.Label ref={ref} className={cn(styles.label, className)} {...props} />
));
Label.displayName = 'InputField.Label';

const Control = Form.Control;
const Message = Form.Message;

const Help = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(styles.help, className)} {...props} />
  ),
);
Help.displayName = 'InputField.Help';

export const InputField = { Root, Label, Control, Message, Help };
