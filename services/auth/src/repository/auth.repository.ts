import { Otp, ResetPassword, User } from "../../generated/prisma";
import {
  AuthRepositoryInterface,
  UserPayload,
} from "../interfaces/auth.interface";
import { prisma } from "../config/prisma";

export class AuthRepository implements AuthRepositoryInterface {
  async findUserById(userId: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserByUsername(username: string): Promise<User | null> {
    return await prisma.user.findUnique({ where: { username } });
  }

  async findUserByMobileNumber(mobileNumber: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { mobileNumber },
    });
  }

  async findOtpByEmail(email: string): Promise<Otp | null> {
    return prisma.otp.findUnique({
      where: {
        email,
      },
    });
  }

  async findByToken(token: string): Promise<ResetPassword | null> {
    return await prisma.resetPassword.findUnique({ where: { token } });
  }

  async create(data: UserPayload): Promise<User> {
    return await prisma.user.create({
      data: {
        ...data,
        isVerified: false, // Set default value
      },
    });
  }

  async createResetToken(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<ResetPassword> {
    return await prisma.resetPassword.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  async update(userId: string, data: Partial<User>): Promise<User | null> {
    return await prisma.user.update({
      where: {
        id: userId,
      },
      data,
    });
  }

  async delete(userId: string): Promise<User | null> {
    return await prisma.user.delete({
      where: {
        id: userId,
      },
    });
  }

  async upsertOtp(
    data: Omit<Otp, "updatedAt" | "id" | "createdAt">
  ): Promise<Otp> {
    return await prisma.otp.upsert({
      where: {
        email: data.email,
      },
      create: data,
      update: {
        otp: data.otp,
        expiresIn: data.expiresIn,
      },
    });
  }

  async deleteOtp(otpId: string): Promise<Otp | null> {
    return await prisma.otp.delete({ where: { id: otpId } });
  }

  async deleteToken(id: string): Promise<ResetPassword | null> {
    return await prisma.resetPassword.delete({ where: { id } });
  }

  async verifyUserTransaction(email: string, otpId: string): Promise<Boolean> {
    await prisma.$transaction(async (prisma) => {
      await prisma.user.update({
        where: {
          email,
        },
        data: {
          isVerified: true,
        },
      });
      await prisma.otp.delete({
        where: {
          id: otpId,
        },
      });
    });
    return true;
  }
}
