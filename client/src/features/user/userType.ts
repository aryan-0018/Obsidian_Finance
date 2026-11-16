

export interface User {
  id: string;
  name: string;
  email: string;
  profilePicture: string;
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

