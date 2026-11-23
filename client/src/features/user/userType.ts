export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  profilePicture: string | null;
  portfolioBalance?: number;
  currency?: string;
  telegramChatId?: string | null;
  telegramUsername?: string | null;
}

export interface GetCurrentUserResponse {
  message: string;
  user: User;
}

export interface UpdateUserResponse {
  message?: string;
  data: User;
}

export interface TelegramStatusResponse {
  message: string;
  data: {
    isConnected: boolean;
    telegramUsername: string | null;
    botUsername: string;
  };
}

export interface TelegramPairCodeResponse {
  message: string;
  data: {
    code: string;
    expiresAt: string;
    botUsername: string;
    link: string;
  };
}

export interface ApiKeyStatusResponse {
  message: string;
  data: {
    hasKey: boolean;
    prefix: string | null;
    createdAt: string | null;
  };
}

export interface GenerateApiKeyResponse {
  message: string;
  data: {
    apiKey: string;
    prefix: string;
    createdAt: string;
  };
}
