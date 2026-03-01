import mongoose, { Document, Schema } from "mongoose";

export interface BudgetDocument extends Document {
    userId: mongoose.Types.ObjectId;
    limit: number;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
}

const budgetSchema = new Schema<BudgetDocument>(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
            unique: true, // One budget profile per user for now
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
    },
    {
        timestamps: true,
    }
);

const BudgetModel = mongoose.model<BudgetDocument>("Budget", budgetSchema);
export default BudgetModel;
