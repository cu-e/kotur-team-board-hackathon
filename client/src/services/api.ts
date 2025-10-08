const BASE_URL: string = (window as any).TEAMBOARD_BASE_URL || '/api';

function loadToken(): string | null {
  try {
    return localStorage.getItem('teamboard_token');
  } catch {
    return null;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = loadToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('unauthorized'));
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const text = await res.text();

    throw new Error(text || `HTTP ${res.status}`);
  }
  try {
    return (await res.json()) as T;
  } catch {
    return undefined as unknown as T;
  }
}
