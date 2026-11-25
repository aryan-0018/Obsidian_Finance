import mongoose, { Document, Schema } from "mongoose";

export interface CategoryBudgetLimit {
  category: string;
  limit: number;
}

export interface BudgetAlertEntry {
  key: string; // e.g. "__global__" or normalized category name
  monthKey: string; // e.g. "2026-11"
  level: "80" | "100";
  sentAt: Date;
}

export interface BudgetDocument extends Document {
  userId: mongoose.Types.ObjectId;
  limit: number;
  currency: string;
  categoryLimits: CategoryBudgetLimit[];
  alertHistory: BudgetAlertEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const categoryLimitSchema = new Schema<CategoryBudgetLimit>(
  {
    category: { type: String, required: true, trim: true, lowercase: true },
    limit: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const alertHistorySchema = new Schema<BudgetAlertEntry>(
  {
    key: { type: String, required: true },
    monthKey: { type: String, required: true },
    level: { type: String, enum: ["80", "100"], required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const budgetSchema = new Schema<BudgetDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      unique: true,
    },
    limit: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    categoryLimits: {
      type: [categoryLimitSchema],
      default: [],
    },
    alertHistory: {
      type: [alertHistorySchema],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const BudgetModel = mongoose.model<BudgetDocument>("Budget", budgetSchema);
export default BudgetModel;
