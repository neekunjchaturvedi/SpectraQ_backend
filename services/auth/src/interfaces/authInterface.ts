import { User, Otp, ResetPassword } from "../../generated/prisma";
export type UserPayload = Pick<User, "email" | "password" | "name"> &
  Partial<Pick<User, "profilePic">>;

export interface AuthRepositoryInterface {
  findUserById(userId: string): Promise<User | null>;
  findUserByEmail(email: string): Promise<User | null>;
  create(data: UserPayload): Promise<User>;
  update(userId: string, data: Partial<User>): Promise<User | null>;
  delete(userId: string): Promise<User | null>;

  findOtpByEmail(email: string): Promise<Otp | null>;
  upsertOtp(data: Omit<Otp, "id" | "updatedAt">): Promise<Otp>;
  deleteOtp(otpId: string): Promise<Otp | null>;

  createResetToken(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<ResetPassword>;
  findByToken(token: string): Promise<ResetPassword | null>;
  deleteToken(id: string): Promise<ResetPassword | null>;
}

declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, "id" | "email" | "name" | "isVerified">;
    }
  }
}
