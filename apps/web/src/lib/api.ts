const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    tenantIndustry: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    permissions: string[];
  };
};

export async function login(input: { tenantSlug: string; email: string; password: string }) {
  return apiPost<LoginResponse>('/auth/login', input);
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Client-Type': 'web',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Client-Type': 'web',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

export async function apiPatch<T>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Client-Type': 'web',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}
