import mongoose, { Document, Schema } from "mongoose";
import { convertToSmallestUnit, convertToUnit } from "../utils/format-currency";

export enum SavingsGoalStatusEnum {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
}

export interface SavingsGoalDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date | null;
  category: string;
  accountId?: mongoose.Types.ObjectId | null;
  status: keyof typeof SavingsGoalStatusEnum;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const savingsGoalSchema = new Schema<SavingsGoalDocument>(
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
    targetAmount: {
      type: Number,
      required: true,
      set: (value: number) => convertToSmallestUnit(value),
      get: (value: number) => convertToUnit(value),
    },
    currentAmount: {
      type: Number,
      default: 0,
      set: (value: number) => convertToSmallestUnit(Math.max(0, value || 0)),
      get: (value: number) => convertToUnit(value || 0),
    },
    deadline: {
      type: Date,
      default: null,
    },
    category: {
      type: String,
      default: "Savings",
      trim: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(SavingsGoalStatusEnum),
      default: SavingsGoalStatusEnum.ACTIVE,
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

savingsGoalSchema.index({ userId: 1, status: 1, createdAt: -1 });

const SavingsGoalModel = mongoose.model<SavingsGoalDocument>(
  "SavingsGoal",
  savingsGoalSchema
);
export default SavingsGoalModel;
