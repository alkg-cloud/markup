/**
 * Tiny classnames joiner — filters falsy entries and joins the rest with
 * a single space. Used by every compound DS primitive (`InputField`,
 * `AlertBanner`, `FolderPicker`, `RadixDialog`) so the optional className
 * forwarding stays consistent and we don't ship four copies of the same
 * three-line helper.
 *
 * Accepts the strings the components actually pass: real class names plus
 * the boolean-short-circuit / `undefined` slots that fall out of
 * `prop && styles.x` and the consumer's optional `className`.
 */
export function cn(...names: Array<string | undefined | false | null>): string {
  return names.filter(Boolean).join(' ');
}
