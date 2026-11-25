import mongoose, { Document, Schema } from "mongoose";
import { convertToSmallestUnit, convertToUnit } from "../utils/format-currency";

export enum SplitDirectionEnum {
  OWED_TO_ME = "OWED_TO_ME",
  I_OWE = "I_OWE",
}

export enum SplitStatusEnum {
  PENDING = "PENDING",
  PARTIAL = "PARTIAL",
  SETTLED = "SETTLED",
}

export interface SplitDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  direction: keyof typeof SplitDirectionEnum;
  counterpartyName: string;
  counterpartyContact?: string;
  totalAmount: number;
  counterpartyShare: number;
  settledAmount: number;
  status: keyof typeof SplitStatusEnum;
  category: string;
  transactionId?: mongoose.Types.ObjectId | null;
  accountId?: mongoose.Types.ObjectId | null;
  dueDate?: Date | null;
  notes?: string;
  settledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const splitSchema = new Schema<SplitDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    direction: {
      type: String,
      enum: Object.values(SplitDirectionEnum),
      default: SplitDirectionEnum.OWED_TO_ME,
    },
    counterpartyName: {
      type: String,
      required: true,
      trim: true,
    },
    counterpartyContact: {
      type: String,
      trim: true,
      default: "",
    },
    totalAmount: {
      type: Number,
      required: true,
      set: (value: number) => convertToSmallestUnit(value),
      get: (value: number) => convertToUnit(value),
    },
    counterpartyShare: {
      type: Number,
      required: true,
      set: (value: number) => convertToSmallestUnit(value),
      get: (value: number) => convertToUnit(value),
    },
    settledAmount: {
      type: Number,
      default: 0,
      set: (value: number) => convertToSmallestUnit(Math.max(0, value || 0)),
      get: (value: number) => convertToUnit(value || 0),
    },
    status: {
      type: String,
      enum: Object.values(SplitStatusEnum),
      default: SplitStatusEnum.PENDING,
    },
    category: {
      type: String,
      default: "split",
      trim: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    settledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  }
);

splitSchema.index({ userId: 1, status: 1, createdAt: -1 });

const SplitModel = mongoose.model<SplitDocument>("Split", splitSchema);
export default SplitModel;
