import mongoose, { Document, Schema } from "mongoose";

export interface VerificationCodeDocument extends Document {
    email: string;
    code: string;
    type: string;
    expiresAt: Date;
    pendingData: any; // Stores the proposed user data (name, hashed password) temporarily
    createdAt: Date;
}

const verificationCodeSchema = new Schema<VerificationCodeDocument>(
    {
        email: { type: String, required: true },
        code: { type: String, required: true },
        type: { type: String, required: true, default: "SIGNUP" }, // Just in case we need it for password resets later
        expiresAt: { type: Date, required: true },
        pendingData: { type: Schema.Types.Mixed, required: true },
        createdAt: { type: Date, default: Date.now, expires: "15m" }, // MongoDB TTL Index: Auto deletes document after 15 minutes of creation
    }
);

const VerificationCodeModel = mongoose.model<VerificationCodeDocument>(
    "VerificationCode",
    verificationCodeSchema,
    "verification_codes"
);

export default VerificationCodeModel;
