import mongoose, { Document, Schema } from "mongoose";
import { compareValue, hashValue } from "../utils/bcrypt";

export interface UserDocument extends Document {
  name: string;
  email: string;
  password: string;
  profilePicture: string | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword: (password: string) => Promise<boolean>;
  omitPassword: () => Omit<UserDocument, "password" | "apiKeyHash" | "refreshTokenHash"> & { id: string };
  portfolioBalance: number;
  currency?: string;
  telegramChatId?: string | null;
  telegramUsername?: string | null;
  telegramPairingCode?: string | null;
  telegramPairingCodeExpires?: Date | null;
  apiKeyHash?: string | null;
  apiKeyPrefix?: string | null;
  apiKeyCreatedAt?: Date | null;
  refreshTokenHash?: string | null;
}

const userSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      select: true,
      required: true,
    },
    portfolioBalance: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    telegramChatId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },
    telegramUsername: {
      type: String,
      default: null,
    },
    telegramPairingCode: {
      type: String,
      default: null,
      index: true,
    },
    telegramPairingCodeExpires: {
      type: Date,
      default: null,
    },
    apiKeyHash: {
      type: String,
      default: null,
      index: true,
      select: false,
    },
    apiKeyPrefix: {
      type: String,
      default: null,
    },
    apiKeyCreatedAt: {
      type: Date,
      default: null,
    },
    refreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    if (this.password) {
      this.password = await hashValue(this.password);
    }
  }
  next();
});

userSchema.methods.omitPassword = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.apiKeyHash;
  delete userObject.refreshTokenHash;
  userObject.id = this._id?.toString();
  return userObject;
};

userSchema.methods.comparePassword = async function (password: string) {
  return compareValue(password, this.password);
};

const UserModel = mongoose.model<UserDocument>("User", userSchema);
export default UserModel;
