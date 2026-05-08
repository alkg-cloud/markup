import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { identify } from '@/lib/auth/identify';
import { isSetupCompleted } from '@/lib/auth/setup-state';

export default async function Root() {
  if (!(await isSetupCompleted())) redirect('/setup');
  const cookieStore = await cookies();
  const headerStore = await headers();
  const fakeReq = {
    cookies: {
      get: (k: string) => {
        const c = cookieStore.get(k);
        return c ? { value: c.value } : undefined;
      },
    },
    headers: { get: (k: string) => headerStore.get(k) },
  } as unknown as Parameters<typeof identify>[0];
  const id = await identify(fakeReq);
  if (!id) redirect('/login');
  redirect('/mockups');
}
