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
  const response = await fetch(await getApiUrl('/auth/login'), {
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
  });

  return parseJsonResponse<LoginResponse>(response);
};

export const getCurrentSession = async (token: string): Promise<void> => {
  const response = await fetch(await getApiUrl('/auth/me'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  await parseJsonResponse(response);
};

export const logout = async (token: string): Promise<void> => {
  await fetch(await getApiUrl('/auth/logout'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).catch(() => undefined);
};

export const revokeSession = async (
  token: string,
  sessionId: string,
): Promise<void> => {
  const response = await fetch(
    await getApiUrl(`/auth/sessions/${sessionId}/revoke`),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  await parseJsonResponse<{ ok: boolean }>(response);
};

export const getChannelsSnapshot = async (token: string): Promise<ChannelsResponse> => {
  const response = await fetch(await getApiUrl('/channels'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseJsonResponse<ChannelsResponse>(response);
};

export const getChannels = async (token: string): Promise<IPTVChannel[]> => {
  const payload = await getChannelsSnapshot(token);

  return payload.channels;
};
