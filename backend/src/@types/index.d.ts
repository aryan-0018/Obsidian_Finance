import { UserDocument } from "../models/user.model";

declare global {
  namespace Express {
    interface User extends Omit<UserDocument, "password" | "apiKeyHash" | "refreshTokenHash"> {
      _id?: any;
      id: string;
    }
  }
}
