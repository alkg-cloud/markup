'use client';

/**
 * `AlertBanner` — DS 27 compound primitive for inline notices.
 *
 * Compound shape:
 *
 *   <AlertBanner.Root status="error">
 *     <AlertBanner.Icon />                       // default symbol per status; override via children
 *     <AlertBanner.Body>
 *       <AlertBanner.Title>Could not upload mockup</AlertBanner.Title>
 *       <AlertBanner.Description>Network request failed.</AlertBanner.Description>
 *     </AlertBanner.Body>
 *     <AlertBanner.Action asChild>             // Slot — caller picks element/handler
 *       <button onClick={retry}>Retry</button>
 *     </AlertBanner.Action>
 *     <AlertBanner.Close asChild>              // Slot — caller composes own X button
 *       <button aria-label="Dismiss"><XIcon /></button>
 *     </AlertBanner.Close>
 *   </AlertBanner.Root>
 *
 * Carries non-field messages: server failures, network errors, success
 * confirmations, informational notices. Field-level validation uses the
 * sibling `InputField` primitive instead.
 *
 * Status drives both visuals and ARIA semantics:
 *   - `error` + `warning` → `role="alert"` (assertive announcement)
 *   - `success` + `info`  → `role="status"` (polite announcement)
 *   - Consumer may override via the `role` prop.
 *
 * `Action` and `Close` accept `asChild` via `@radix-ui/react-slot` so the
 * consumer owns the element type and event handlers — Radix's standard
 * recipe (mirrors `AlertDialog.Cancel asChild` in `ConfirmDialog`). Without
 * `asChild` both render a native `<button type="button">`.
 *
 * See `docs/design/design-system/27-alert-banner.html` for the visual
 * contract — `AlertBanner.module.css` is a verbatim port of its style block.
 */

import { Slot } from '@radix-ui/react-slot';
import { type ComponentPropsWithoutRef, createContext, forwardRef, useContext } from 'react';
import { cn } from '@/lib/cn';
import styles from './AlertBanner.module.css';

type AlertBannerStatus = 'error' | 'warning' | 'success' | 'info';

const DEFAULT_ICONS: Record<AlertBannerStatus, string> = {
  error: '!',
  warning: '⚠',
  success: '✓',
  info: 'i',
};

function autoRole(status: AlertBannerStatus): 'alert' | 'status' {
  return status === 'error' || status === 'warning' ? 'alert' : 'status';
}

const StatusContext = createContext<AlertBannerStatus | null>(null);

type RootProps = Omit<ComponentPropsWithoutRef<'div'>, 'role'> & {
  status: AlertBannerStatus;
  /** Override the auto-picked ARIA role (alert for error/warning, status otherwise). */
  role?: string;
};

const Root = forwardRef<HTMLDivElement, RootProps>(
  ({ status, role, className, children, ...props }, ref) => (
    <StatusContext.Provider value={status}>
      <div
        ref={ref}
        data-status={status}
        role={role ?? autoRole(status)}
        className={cn(styles.banner, className)}
        {...props}
      >
        {children}
      </div>
    </StatusContext.Provider>
  ),
);
Root.displayName = 'AlertBanner.Root';

const Icon = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  ({ className, children, ...props }, ref) => {
    const status = useContext(StatusContext);
    const content =
      children !== undefined && children !== null
        ? children
        : status
          ? DEFAULT_ICONS[status]
          : null;
    return (
      <div ref={ref} className={cn(styles.icon, className)} aria-hidden="true" {...props}>
        {content}
      </div>
    );
  },
);
Icon.displayName = 'AlertBanner.Icon';

const Body = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(styles.body, className)} {...props} />
  ),
);
Body.displayName = 'AlertBanner.Body';

const Title = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(styles.title, className)} {...props} />
  ),
);
Title.displayName = 'AlertBanner.Title';

const Description = forwardRef<HTMLParagraphElement, ComponentPropsWithoutRef<'p'>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn(styles.description, className)} {...props} />
  ),
);
Description.displayName = 'AlertBanner.Description';

type SlottableButtonProps = ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean;
};

const Action = forwardRef<HTMLButtonElement, SlottableButtonProps>(
  ({ asChild, className, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(styles.action, className)}
        // Slot merges with the consumer's element type/attrs. For the native
        // button branch we default to type="button" to avoid accidental form
        // submissions when an AlertBanner sits inside a <form>.
        {...(asChild ? {} : { type: type ?? 'button' })}
        {...props}
      />
    );
  },
);
Action.displayName = 'AlertBanner.Action';

const Close = forwardRef<HTMLButtonElement, SlottableButtonProps>(
  ({ asChild, className, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(styles.closeBtn, className)}
        {...(asChild
          ? {}
          : { type: type ?? 'button', 'aria-label': props['aria-label'] ?? 'Dismiss' })}
        {...props}
      />
    );
  },
);
Close.displayName = 'AlertBanner.Close';

export const AlertBanner = { Root, Icon, Body, Title, Description, Action, Close };
