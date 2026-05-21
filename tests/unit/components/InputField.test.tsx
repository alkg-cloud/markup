// @vitest-environment jsdom

import * as Form from '@radix-ui/react-form';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InputField } from '@/components/InputField';

// React 19 emits "current testing environment is not configured to support
// act(...)" warnings unless this global flag is set. Vitest's jsdom env
// doesn't set it for us. Setting it here keeps the suite quiet.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function renderNode(node: React.ReactElement) {
  act(() => {
    root.render(node);
  });
}

describe('InputField', () => {
  it('renders resting state with label, control, and help text', () => {
    renderNode(
      <Form.Root>
        <InputField.Root name="name">
          <InputField.Label>Name</InputField.Label>
          <InputField.Control asChild>
            <input type="text" defaultValue="pricing-v3" />
          </InputField.Control>
          <InputField.Help>Lowercase letters, numbers, or hyphens.</InputField.Help>
        </InputField.Root>
      </Form.Root>,
    );

    const field = container.querySelector('[data-radix-form-field]') as HTMLElement | null;
    // Radix Form Field tags the element with a data attribute; even if the
    // attribute name changes upstream, the class hook we control should
    // still be present.
    const fieldWithClass = container.querySelector('div[class*="field"]') as HTMLElement;
    expect(fieldWithClass).not.toBeNull();
    expect(fieldWithClass.hasAttribute('data-state')).toBe(false);
    expect(fieldWithClass.hasAttribute('data-invalid')).toBe(false);

    expect(container.querySelector('label')).not.toBeNull();
    expect(container.querySelector('input')).not.toBeNull();
    expect(container.textContent).toContain('Lowercase letters');
    void field; // keep var to silence unused if Radix changes attr
  });

  it('renders [data-state="error"] when consumer sets it (server-side path)', () => {
    renderNode(
      <Form.Root>
        <InputField.Root name="name" data-state="error">
          <InputField.Label>Name</InputField.Label>
          <InputField.Control asChild>
            <input type="text" defaultValue="taken-name" />
          </InputField.Control>
          <InputField.Help>That name is already taken.</InputField.Help>
        </InputField.Root>
      </Form.Root>,
    );

    const field = container.querySelector('div[class*="field"]') as HTMLElement;
    expect(field.getAttribute('data-state')).toBe('error');
    expect(container.textContent).toContain('That name is already taken.');
  });

  it('renders [data-state="success"] for affirmative confirmation', () => {
    renderNode(
      <Form.Root>
        <InputField.Root name="name" data-state="success" hasTrailingIcon>
          <InputField.Label>Name</InputField.Label>
          <InputField.Control asChild>
            <input type="text" defaultValue="pricing-v3" />
          </InputField.Control>
          <InputField.Help>Name is available.</InputField.Help>
        </InputField.Root>
      </Form.Root>,
    );

    const field = container.querySelector('div[class*="field"]') as HTMLElement;
    expect(field.getAttribute('data-state')).toBe('success');
    // hasTrailingIcon flag applies a layout-modifier class
    expect(field.className).toMatch(/hasTrailingIcon/i);
    expect(container.textContent).toContain('Name is available.');
  });

  it('reflects Radix Form [data-invalid] when the embedded input fails validation on submit', () => {
    // A required, empty input that the user attempts to submit. Radix Form
    // surfaces ValidityState as data-invalid on the Field. The CSS hook
    // selects both [data-state="error"] AND [data-invalid] — so this path
    // must work without any data-state prop on Root.
    renderNode(
      <Form.Root>
        <InputField.Root name="name">
          <InputField.Label>Name</InputField.Label>
          <InputField.Control asChild>
            <input type="text" required />
          </InputField.Control>
          <InputField.Message match="valueMissing">A name is required.</InputField.Message>
        </InputField.Root>
        <button type="submit">Submit</button>
      </Form.Root>,
    );

    const form = container.querySelector('form') as HTMLFormElement;
    const submit = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(form).not.toBeNull();
    act(() => {
      submit.click();
    });

    const field = container.querySelector('div[class*="field"]') as HTMLElement;
    expect(field.hasAttribute('data-invalid')).toBe(true);
    // Message renders when match condition is hit.
    expect(container.textContent).toContain('A name is required.');
  });

  it('associates the label with the input via htmlFor / id (Radix Form auto-wires)', () => {
    renderNode(
      <Form.Root>
        <InputField.Root name="email">
          <InputField.Label>Email</InputField.Label>
          <InputField.Control asChild>
            <input type="email" />
          </InputField.Control>
        </InputField.Root>
      </Form.Root>,
    );

    const label = container.querySelector('label') as HTMLLabelElement;
    const input = container.querySelector('input') as HTMLInputElement;
    expect(label.htmlFor).toBeTruthy();
    expect(label.htmlFor).toBe(input.id);
  });

  it('applies hasLeadingIcon layout-modifier class when set on Root', () => {
    renderNode(
      <Form.Root>
        <InputField.Root name="search" hasLeadingIcon>
          <InputField.Label>Search</InputField.Label>
          <InputField.Control asChild>
            <input type="text" />
          </InputField.Control>
        </InputField.Root>
      </Form.Root>,
    );
    const field = container.querySelector('div[class*="field"]') as HTMLElement;
    expect(field.className).toMatch(/hasLeadingIcon/i);
  });
});
