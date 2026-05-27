import { IPTVChannel } from '../types/iptv';

const DEVELOPMENT_API_BASE_URL = 'http://localhost:4000';
const PRODUCTION_API_BASE_URL = 'http://localhost:4000';

export const API_BASE_URL = __DEV__
  ? DEVELOPMENT_API_BASE_URL
  : PRODUCTION_API_BASE_URL;

interface LoginResponse {
  token: string;
  expiresAt: string;
  user: {
    username: string;
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

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorCode =
      typeof payload?.error === 'string' ? payload.error : 'REQUEST_FAILED';
    const message =
      typeof payload?.message === 'string'
        ? payload.message
        : 'No se pudo completar la solicitud.';

    throw new ApiError(message, response.status, errorCode);
  }

  return payload as T;
};

export const login = async ({
  username,
  password,
  deviceId,
  deviceName,
}: {
  username: string;
  password: string;
  deviceId: string;
  deviceName: string;
}): Promise<LoginResponse> => {
  const response = await fetch(getApiUrl('/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
      deviceId,
      deviceName,
    }),
  });

  return parseJsonResponse<LoginResponse>(response);
};

export const getCurrentSession = async (token: string): Promise<void> => {
  const response = await fetch(getApiUrl('/auth/me'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  await parseJsonResponse(response);
};

export const logout = async (token: string): Promise<void> => {
  await fetch(getApiUrl('/auth/logout'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).catch(() => undefined);
};

export const getChannelsSnapshot = async (token: string): Promise<ChannelsResponse> => {
  const response = await fetch(getApiUrl('/channels'), {
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
