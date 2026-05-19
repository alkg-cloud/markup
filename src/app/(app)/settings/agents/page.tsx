'use client';

import { useEffect, useState } from 'react';
import { Topbar } from '@/components/Topbar/Topbar';
import { useRequireAuth } from '@/lib/hooks/use-require-auth';
import { AgentsClient } from './AgentsClient';

interface AgentTokenRow {
  id: string;
  name: string;
  prefix: string | null;
  lastFour: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

interface AgentTokensResponse {
  tokens: AgentTokenRow[];
}

export default function AgentsPage() {
  const { identity, loading: authLoading } = useRequireAuth();
  const [tokens, setTokens] = useState<AgentTokenRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !identity) return;
    let cancelled = false;
    fetch('/api/agent-tokens', { credentials: 'include' })
      .then(async (res) => {
        if (cancelled) return;
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
        const json: AgentTokensResponse = await res.json();
        if (!cancelled) setTokens(json.tokens);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, identity]);

  if (error) {
    return (
      <main style={{ padding: 24, color: 'var(--danger)' }}>
        {error === 'forbidden' ? 'Admin-only page.' : `Failed to load tokens (${error}).`}
      </main>
    );
  }
  if (!tokens) {
    return null;
  }

  return (
    <>
      <Topbar breadcrumbs={[]} userName={identity?.name} userEmail={identity?.email} />
      <AgentsClient initialTokens={tokens} />
    </>
  );
}
