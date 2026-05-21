import { describe, expect, it } from 'vitest';
import {
  NAME_LENGTH_WARN_THRESHOLD,
  NAME_MAX_LENGTH,
  urlSafeNameSchema,
  validateUrlSafeName,
} from '@/lib/validation/url-safe-name';

describe('NAME_MAX_LENGTH', () => {
  it('is 64', () => {
    expect(NAME_MAX_LENGTH).toBe(64);
  });

  it('NAME_LENGTH_WARN_THRESHOLD is NAME_MAX_LENGTH - 8 = 56', () => {
    expect(NAME_LENGTH_WARN_THRESHOLD).toBe(56);
  });
});

describe('validateUrlSafeName', () => {
  it('returns null for valid short names', () => {
    expect(validateUrlSafeName('hello')).toBeNull();
    expect(validateUrlSafeName('My-Project_1')).toBeNull();
  });

  it('returns null for a name of exactly NAME_MAX_LENGTH chars', () => {
    const name = 'a'.repeat(NAME_MAX_LENGTH);
    expect(validateUrlSafeName(name)).toBeNull();
  });

  it('returns name_required for empty string', () => {
    const err = validateUrlSafeName('');
    expect(err).not.toBeNull();
    expect(err?.code).toBe('name_required');
  });

  it('returns name_too_long for names over NAME_MAX_LENGTH', () => {
    const name = 'a'.repeat(NAME_MAX_LENGTH + 1);
    const err = validateUrlSafeName(name);
    expect(err).not.toBeNull();
    expect(err?.code).toBe('name_too_long');
    expect(err?.message).toContain(String(NAME_MAX_LENGTH));
  });

  it('returns name_not_url_safe for names with forbidden chars', () => {
    const err = validateUrlSafeName('hello world');
    expect(err).not.toBeNull();
    expect(err?.code).toBe('name_not_url_safe');
    expect(err?.offendingChar).toBe(' ');
  });

  it('name_too_long takes priority over name_not_url_safe', () => {
    // A name over 64 chars with bad chars — length check runs first
    const name = 'a'.repeat(65) + ' bad';
    const err = validateUrlSafeName(name);
    expect(err?.code).toBe('name_too_long');
  });
});

describe('urlSafeNameSchema', () => {
  it('accepts a valid name', () => {
    const schema = urlSafeNameSchema();
    expect(schema.safeParse('my-project').success).toBe(true);
  });

  it('accepts a name of exactly NAME_MAX_LENGTH chars', () => {
    const schema = urlSafeNameSchema();
    const name = 'a'.repeat(NAME_MAX_LENGTH);
    expect(schema.safeParse(name).success).toBe(true);
  });

  it('rejects a name of NAME_MAX_LENGTH + 1 chars with name_too_long', () => {
    const schema = urlSafeNameSchema();
    const name = 'a'.repeat(NAME_MAX_LENGTH + 1);
    const result = schema.safeParse(name);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('name_too_long');
    }
  });

  it('rejects an empty string with name_required', () => {
    const schema = urlSafeNameSchema();
    const result = schema.safeParse('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('name_required');
    }
  });

  it('rejects a name with forbidden chars with name_not_url_safe', () => {
    const schema = urlSafeNameSchema();
    const result = schema.safeParse('hello world');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('name_not_url_safe');
    }
  });

  it('optional() still rejects over-length non-undefined values', () => {
    const schema = urlSafeNameSchema().optional();
    const name = 'a'.repeat(NAME_MAX_LENGTH + 1);
    const result = schema.safeParse(name);
    expect(result.success).toBe(false);
  });

  it('optional() accepts undefined', () => {
    const schema = urlSafeNameSchema().optional();
    expect(schema.safeParse(undefined).success).toBe(true);
  });
});
