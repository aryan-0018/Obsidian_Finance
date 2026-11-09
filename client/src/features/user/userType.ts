

export interface User {
  id: string;
  name: string;
  email: string;
  profilePicture: string;
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

