'use client';

import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { API_URL, apiFetch } from '@/lib/api';

type ApiRoot = { message: string };

export function ApiStatusCard() {
  const { data, error, isPending } = useQuery({
    queryKey: ['api-root'],
    queryFn: () => apiFetch<ApiRoot>('/'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backend connection</CardTitle>
        <CardDescription>{API_URL}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        {isPending && <Badge variant="secondary">Checking…</Badge>}
        {error && <Badge variant="destructive">Unreachable</Badge>}
        {data && (
          <>
            <Badge>Connected</Badge>
            <span className="text-sm text-muted-foreground">{data.message}</span>
          </>
        )}
      </CardContent>
    </Card>
  );
}
