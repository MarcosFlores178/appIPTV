import { DeviceSession, IPTVChannel } from '../types/iptv';
import { getBackendBaseUrl } from './backendConfig';

interface LoginResponse {
  token: string;
  expiresAt: string;
  user: {
    username: string;
  };
  device: {
    deviceId: string;
    deviceName: string;
    manufacturer?: string;
    model?: string;
  };
}

export interface ChannelsResponse {
  channels: IPTVChannel[];
  count: number;
  updatedAt: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  canceledReason?: string;
  activeSessions?: DeviceSession[];

  constructor(
    message: string,
    status: number,
    code?: string,
    canceledReason?: string,
    activeSessions?: DeviceSession[],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.canceledReason = canceledReason;
    this.activeSessions = activeSessions;
  }
}

export const getApiUrl = async (path: string): Promise<string> =>
  `${await getBackendBaseUrl()}${path}`;

// Helper fetch con timeout usando AbortController
const fetchWithTimeout = async (
  input: RequestInfo,
  init?: RequestInit,
  timeoutMs = 10000,
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const mergedInit = { ...(init || {}), signal: controller.signal } as RequestInit;
    const res = await fetch(input, mergedInit);
    return res;
  } finally {
    clearTimeout(id);
  }
};

// Mejorar errores de red: convertir aborts y fallos de fetch en ApiError
const safeFetch = async (input: RequestInfo, init?: RequestInit, timeoutMs = 10000) => {
  try {
    return await fetchWithTimeout(input, init, timeoutMs);
  } catch (err: any) {
    if (err && err.name === 'AbortError') {
      throw new ApiError('Tiempo de espera de la conexión agotado.', 0, 'REQUEST_TIMEOUT');
    }

    // Error de red no HTTP (DNS, unreachable, network down)
    const message = err instanceof Error ? err.message : 'Error de red';
    throw new ApiError(message, 0, 'NETWORK_ERROR');
  }
};

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorCode =
      typeof payload?.error === 'string' ? payload.error : 'REQUEST_FAILED';
    const message =
      typeof payload?.message === 'string'
        ? payload.message
        : 'No se pudo completar la solicitud.';
    const canceledReason =
      typeof payload?.canceledReason === 'string'
        ? payload.canceledReason
        : undefined;
    const activeSessions =
      Array.isArray(payload?.activeSessions) ? payload.activeSessions : undefined;

    throw new ApiError(message, response.status, errorCode, canceledReason, activeSessions);
  }

  return payload as T;
};

export const login = async ({
  username,
  password,
  deviceId,
  deviceName,
  manufacturer,
  model,
}: {
  username: string;
  password: string;
  deviceId: string;
  deviceName: string;
  manufacturer?: string;
  model?: string;
}): Promise<LoginResponse> => {
  const response = await safeFetch(await getApiUrl('/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
      deviceId,
      deviceName,
      ...(manufacturer && { manufacturer }),
      ...(model && { model }),
    }),
  }, 10000);

  return parseJsonResponse<LoginResponse>(response);
};

export const getCurrentSession = async (token: string): Promise<void> => {
  const response = await safeFetch(await getApiUrl('/auth/me'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }, 8000);

  await parseJsonResponse(response);
};

export const logout = async (token: string): Promise<void> => {
  await safeFetch(await getApiUrl('/auth/logout'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }, 5000).catch(() => undefined);
};

export const revokeSession = async (
  token: string,
  sessionId: string,
): Promise<void> => {
  const response = await safeFetch(
    await getApiUrl(`/auth/sessions/${sessionId}/revoke`),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    8000,
  );

  await parseJsonResponse<{ ok: boolean }>(response);
};

export const revokeSessionWithCredentials = async ({
  username,
  password,
  sessionId,
}: {
  username: string;
  password: string;
  sessionId: string;
}): Promise<void> => {
  const response = await safeFetch(await getApiUrl('/auth/revoke-session'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
      sessionId,
    }),
  }, 10000);

  await parseJsonResponse<{ ok: boolean }>(response);
};

export const getChannelsSnapshot = async (token: string): Promise<ChannelsResponse> => {
  const response = await safeFetch(await getApiUrl('/channels'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }, 12000);

  return parseJsonResponse<ChannelsResponse>(response);
};

export const getChannels = async (token: string): Promise<IPTVChannel[]> => {
  const payload = await getChannelsSnapshot(token);

  return payload.channels;
};
