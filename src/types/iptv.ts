export interface IPTVChannel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
}

export interface DeviceSession {
  id: string;
  manufacturer: string;
  model: string;
  lastSeenAt: string;
}

export interface LoginErrorWithSessions {
  activeSessions: DeviceSession[];
}
