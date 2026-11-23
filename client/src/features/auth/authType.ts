export interface AuthUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  profilePicture: string | null;
  currency?: string;
  portfolioBalance?: number;
  telegramChatId?: string | null;
  telegramUsername?: string | null;
}

export interface AuthReportSetting {
  _id?: string;
  userId?: string;
  frequency?: string;
  isEnabled: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface GoogleLoginPayload {
  token: string;
}

export interface LoginResponse {
  message: string;
  user: AuthUser;
  accessToken: string;
  expiresAt: number;
  reportSetting: AuthReportSetting | null;
}

export interface RegisterResponse {
  message: string;
  data: AuthUser;
}

export interface RefreshTokenResponse {
  message: string;
  accessToken: string;
  expiresAt: number;
}
