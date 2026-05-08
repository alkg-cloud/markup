import { redirect } from 'next/navigation';
import { isSetupCompleted } from '@/lib/auth/setup-state';
import { Form } from './Form';

export default async function LoginPage() {
  if (!(await isSetupCompleted())) redirect('/setup');
  return (
    <main style={{ maxWidth: 480, margin: '60px auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Sign in</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Enter your credentials to access Markup.</p>
      <Form />
    </main>
  );
}
