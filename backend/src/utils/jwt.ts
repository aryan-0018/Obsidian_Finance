import crypto from "crypto";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { Env } from "../config/env.config";

type TimeUnit = "s" | "m" | "h" | "d" | "w" | "y";
type TimeString = `${number}${TimeUnit}`;

export type AccessTokenPayload = {
  userId: string;
};

export type RefreshTokenPayload = {
  userId: string;
  jti: string;
  type: "refresh";
};

type SignOptsAndSecret = SignOptions & {
  secret: string;
  expiresIn?: TimeString | number;
};

const defaults: SignOptions = {
  audience: ["user"],
  algorithm: "HS256",
};

const accessTokenSignOptions: SignOptsAndSecret = {
  expiresIn: Env.JWT_EXPIRES_IN as TimeString,
  secret: Env.JWT_SECRET,
};

export const signJwtToken = (
  payload: AccessTokenPayload,
  options?: SignOptsAndSecret
) => {
  const isAccessToken = !options || options === accessTokenSignOptions;
  const { secret, ...opts } = options || accessTokenSignOptions;

  const token = jwt.sign(payload, secret, {
    ...defaults,
    ...opts,
  });

  const expiresAt = isAccessToken
    ? (jwt.decode(token) as JwtPayload)?.exp! * 1000
    : undefined;

  return {
    token,
    expiresAt,
  };
};

export const signRefreshToken = (userId: string) => {
  const jti = crypto.randomUUID();
  const payload: RefreshTokenPayload = {
    userId,
    jti,
    type: "refresh",
  };

  const token = jwt.sign(payload, Env.JWT_REFRESH_SECRET, {
    ...defaults,
    expiresIn: Env.JWT_REFRESH_EXPIRES_IN as TimeString,
  });

  return {
    token,
    hash: hashToken(token),
  };
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, Env.JWT_REFRESH_SECRET, {
    algorithms: ["HS256"],
    audience: ["user"],
  }) as JwtPayload & Partial<RefreshTokenPayload>;

  if (!decoded || !decoded.userId || decoded.type !== "refresh") {
    throw new Error("Invalid refresh token payload");
  }

  return {
    userId: String(decoded.userId),
    jti: String(decoded.jti || ""),
    type: "refresh",
  };
};

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
