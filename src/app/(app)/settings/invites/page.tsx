'use client';

import { useEffect, useState } from 'react';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { LoadingState } from '@/components/LoadingState/LoadingState';
import { Topbar } from '@/components/Topbar/Topbar';
import { useIdentity } from '@/lib/hooks/use-require-auth';
import { type InviteRow, InvitesClient } from './InvitesClient';

interface InvitesResponse {
  invites: InviteRow[];
}

export default function InvitesPage() {
  const identity = useIdentity();
  const [invites, setInvites] = useState<InviteRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/invites', { credentials: 'include', signal: controller.signal })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.replace('/login');
          return;
        }
        if (res.status === 403) {
          setError('forbidden');
          return;
        }
        if (!res.ok) {
          setError(`http_${res.status}`);
          return;
        }
        const json: InvitesResponse = await res.json();
        setInvites(json.invites);
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        setError(String(e));
      });
    return () => controller.abort();
  }, []);

  if (error) {
    return (
      <ErrorState
        error={error === 'forbidden' ? 'Admin-only page.' : `Failed to load invites (${error}).`}
      />
    );
  }
  if (!invites) {
    return <LoadingState />;
  }

  return (
    <>
      <Topbar
        breadcrumbs={[]}
        userName={identity?.name}
        userEmail={identity?.email}
        userRole={identity?.role}
      />
      <InvitesClient initialInvites={invites} />
    </>
  );
}
