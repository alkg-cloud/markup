import { redirect } from 'next/navigation';
import { isSetupCompleted } from '@/lib/auth/setup-state';
import { Form } from './Form';

export default async function SetupPage() {
  if (await isSetupCompleted()) redirect('/login');
  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Welcome to Markup</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Create the administrator account to continue.
      </p>
      <Form />
    </main>
  );
}
