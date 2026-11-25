import mongoose, { Document, Schema } from "mongoose";
import { convertToSmallestUnit, convertToUnit } from "../utils/format-currency";

export enum AccountTypeEnum {
  BANK = "BANK",
  CREDIT_CARD = "CREDIT_CARD",
  CASH = "CASH",
  WALLET = "WALLET",
  INVESTMENT = "INVESTMENT",
}

export interface AccountDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: keyof typeof AccountTypeEnum;
  institution?: string;
  accountMask?: string | null;
  balance: number;
  creditLimit?: number;
  currency: string;
  isDefault: boolean;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<AccountDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(AccountTypeEnum),
      default: AccountTypeEnum.BANK,
    },
    institution: {
      type: String,
      trim: true,
      default: "",
    },
    accountMask: {
      type: String,
      trim: true,
      default: null,
    },
    balance: {
      type: Number,
      default: 0,
      set: (value: number) => convertToSmallestUnit(value),
      get: (value: number) => convertToUnit(value),
    },
    creditLimit: {
      type: Number,
      default: 0,
      set: (value: number) => convertToSmallestUnit(value || 0),
      get: (value: number) => convertToUnit(value || 0),
    },
    currency: {
      type: String,
      default: "INR",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: "#e5c158",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

accountSchema.index({ userId: 1, isDefault: -1, createdAt: 1 });
accountSchema.index({ userId: 1, accountMask: 1 });

const AccountModel = mongoose.model<AccountDocument>("Account", accountSchema);
export default AccountModel;
