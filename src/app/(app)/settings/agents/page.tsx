'use client';

import { useEffect, useState } from 'react';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { LoadingState } from '@/components/LoadingState/LoadingState';
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
  const [tokens, setTokens] = useState<AgentTokenRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/agent-tokens', { credentials: 'include', signal: controller.signal })
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
        const json: AgentTokensResponse = await res.json();
        setTokens(json.tokens);
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
        error={error === 'forbidden' ? 'Admin-only page.' : `Failed to load tokens (${error}).`}
      />
    );
  }
  if (!tokens) {
    return <LoadingState />;
  }

  return <AgentsClient initialTokens={tokens} />;
}
