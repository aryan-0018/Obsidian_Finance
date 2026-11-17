import crypto from "crypto";
import UserModel, { UserDocument } from "../models/user.model";
import { NotFoundException, UnauthorizedException } from "../utils/app-error";

/**
 * Generate a cryptographically secure API key for the user.
 * Format: obs_live_<48-hex-chars>
 * Storage: Only the SHA-256 hash is saved to the database.
 */
export const generateUserApiKeyService = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundException("User not found");

  const randomBytes = crypto.randomBytes(24).toString("hex");
  const rawApiKey = `obs_live_${randomBytes}`;
  const apiKeyHash = crypto.createHash("sha256").update(rawApiKey).digest("hex");
  const apiKeyPrefix = `${rawApiKey.substring(0, 13)}••••${rawApiKey.substring(rawApiKey.length - 4)}`;
  const apiKeyCreatedAt = new Date();

  user.apiKeyHash = apiKeyHash;
  user.apiKeyPrefix = apiKeyPrefix;
  user.apiKeyCreatedAt = apiKeyCreatedAt;
  await user.save();

  return {
    apiKey: rawApiKey,
    prefix: apiKeyPrefix,
    createdAt: apiKeyCreatedAt,
  };
};

/**
 * Revoke the user's active API key.
 */
export const revokeUserApiKeyService = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundException("User not found");

  user.apiKeyHash = null;
  user.apiKeyPrefix = null;
  user.apiKeyCreatedAt = null;
  await user.save();

  return { success: true };
};

/**
 * Get API Key metadata without exposing any raw secrets.
 */
export const getUserApiKeyStatusService = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new NotFoundException("User not found");

  return {
    hasKey: !!user.apiKeyPrefix,
    prefix: user.apiKeyPrefix || null,
    createdAt: user.apiKeyCreatedAt || null,
  };
};

/**
 * Authenticate incoming requests by checking SHA-256 hash of provided API key.
 */
export const authenticateApiKey = async (
  rawKey: string | undefined
): Promise<UserDocument> => {
  if (!rawKey || typeof rawKey !== "string" || !rawKey.startsWith("obs_live_")) {
    throw new UnauthorizedException("Missing or invalid X-API-KEY header");
  }

  const hash = crypto.createHash("sha256").update(rawKey.trim()).digest("hex");
  const user = await UserModel.findOne({ apiKeyHash: hash });

  if (!user) {
    throw new UnauthorizedException("Invalid or revoked API key");
  }

  return user;
};
