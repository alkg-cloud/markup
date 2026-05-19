/**
 * Canonical annotation status set. Source of truth for both the React
 * components (status pill, status toggle group) and the API routes
 * (`zod.enum(ANNOTATION_STATUSES)`). Add a new status here and every
 * site picks it up via the TypeScript union.
 */
export const ANNOTATION_STATUSES = ['open', 'needs review', 'resolved'] as const;
export type AnnotationStatus = (typeof ANNOTATION_STATUSES)[number];
