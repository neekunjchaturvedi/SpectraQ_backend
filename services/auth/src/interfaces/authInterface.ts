import { User, Otp, ResetPassword } from "../../generated/prisma";

// use `prisma` in your application to read and write data in your DB
/**
 * Defines the data structure for creating a new user.
 * Based on the 'User' model in the Prisma schema.
 */
export type UserPayload = Pick<User, "email" | "password" | "name"> &
  Partial<Pick<User, "profilePic">>;

/**
 * Defines the contract for the authentication repository.
 * This interface outlines all the methods required for data access
 * related to users, OTPs, and password resets.
 */
export interface AuthRepositoryInterface {
  // --- User Methods ---
  findUserById(userId: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  create(data: UserPayload): Promise<User>;
  update(userId: string, data: Partial<User>): Promise<User | null>;
  delete(userId: string): Promise<User | null>;

  // --- OTP (One-Time Password) Methods ---
  findOtpByEmail(email: string): Promise<Otp | null>;
  upsertOtp(data: Omit<Otp, "id" | "updatedAt">): Promise<Otp>;
  deleteOtp(otpId: string): Promise<Otp | null>;

  // --- Reset Password Methods ---
  createResetToken(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<ResetPassword>;
  findByToken(token: string): Promise<ResetPassword | null>;
  deleteToken(id: string): Promise<ResetPassword | null>;
}

/**
 * Augments the global Express 'Request' interface to include a 'user' property.
 * This allows attaching authenticated user data to requests in a type-safe way.
 */
declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, "id" | "email" | "name" | "isVerified">;
    }
  }
}
