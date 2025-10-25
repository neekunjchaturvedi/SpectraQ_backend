import { createHash } from "crypto";
import {
  AuthRepositoryInterface,
  UserPayload,
} from "../interfaces/auth.interface";
import {
  decodeToken,
  generateHash,
  generateSalt,
  isvalidEmail,
} from "../utils";
import {
  APIError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../utils/error";
import config from "../config";

export class AuthService {
  private _repo: AuthRepositoryInterface;
  constructor(repository: AuthRepositoryInterface) {
    this._repo = repository;
  }

  async userDetails(userId: string) {
    const user = await this._repo.findUserById(userId);
    if (!user) throw new NotFoundError("User not found");
    const { password, salt, ...rest } = user;
    return rest;
  }

  async getUserByEmail(email: string) {
    if (!email) throw new ValidationError("Missing email");
    const user = await this._repo.findUserByEmail(email);
    if (!user) throw new NotFoundError("User not found");
    const { password, salt, ...rest } = user;
    return rest;
  }

  async register(data: {
    email: string;
    password: string;
    role: string;
    mobileNumber: string;
    username: string;
    name: string;
  }) {
    const { email, password, role, mobileNumber, username, name } = data;
    if (!email || !password || !name || !username)
      throw new ValidationError("Missing fields!");
    if (!isvalidEmail(email)) throw new ValidationError("Invalid Email");
    if (password.length < 8)
      throw new ValidationError("Password should be at least 8 letters");

    const emailExist = await this._repo.findUserByEmail(email);
    if (emailExist) throw new ConflictError("Email already exists");

    const usernameExist = await this._repo.findUserByUsername(username);
    if (usernameExist) throw new ConflictError("Username already exists");

    const mobileNumberExist = await this._repo.findUserByMobileNumber(
      mobileNumber
    );
    if (mobileNumberExist) {
      throw new ConflictError("Mobile Number already exists");
    }

    const salt = generateSalt();
    const hashedPassword = generateHash(salt, password);

    const user = await this._repo.create({
      email,
      password: hashedPassword,
      name,
      username,
      role,
      salt,
      mobileNumber,
    });

    if (!user) throw new APIError("Failed to create user");
    return {
      message: "An OTP has been sent to your email. Please Verify!",
      userId: user.id,
    };
  }

  async rollbackCreate(userId: string) {
    const user = await this._repo.findUserById(userId);
    if (!user) return;
    await this._repo.delete(userId);
  }

  async login(email: string, password: string) {
    if (!email || !password) throw new ValidationError("Missing Fields");
    if (!isvalidEmail(email)) {
      throw new ValidationError("Invalid Email");
    }
    if (password.length < 8) {
      throw new ValidationError("Password should be at least 8 letters");
    }

    const userExists = await this._repo.findUserByEmail(email);
    if (!userExists) throw new NotFoundError("User not found");

    if (userExists.isVerified === false) {
      return {
        verified: false,
        id: userExists.id,
        email: userExists.email,
        role: userExists.role,
        username: userExists.username,
      };
    }

    const hashedPassword = generateHash(userExists.salt!, password);
    if (hashedPassword !== userExists.password) {
      throw new ValidationError("Invalid Password");
    }

    return {
      id: userExists.id,
      email: userExists.email,
      role: userExists.role,
      username: userExists.username,
      verified: true,
    };
  }

  async userByUsername(username: string, userId: string) {
    const userExists = await this._repo.findUserByUsername(username);
    if (!userExists) throw new NotFoundError("User not found");
    if (userExists.id !== userId) {
      throw new ForbiddenError();
    }
    return {
      id: userExists.id,
      email: userExists.email,
      username: userExists.username,
      mobileNumber: userExists.mobileNumber,
    };
  }

  async verify(email: string, otp: number) {
    if (!email || !otp) throw new ValidationError("Missing Fields");
    const otpExists = await this._repo.findOtpByEmail(email);
    if (!otpExists) throw new ValidationError("Retry sending otp");
    if (typeof otp !== "number") {
      throw new ValidationError("OTP should be number");
    }
    if (otpExists.otp !== otp) throw new ValidationError("Invalid OTP");
    const currentTime = new Date();
    if (currentTime > otpExists.expiresIn) {
      throw new ValidationError("OTP has expired!");
    }
    const data = await this._repo.verifyUserTransaction(email, otpExists.id);
    if (!data) throw new ValidationError("Failed to verify OTP");
    return data;
  }

  async generateAndStoreOtp(email: string): Promise<string> {
    const user = await this._repo.findUserByEmail(email);
    if (!user) throw new ValidationError("Email doesn't exist");
    if (user.isVerified) throw new ValidationError("Email already verified");

    const otp = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");

    await this._repo.upsertOtp({
      email,
      otp: parseInt(otp),
      expiresIn: new Date(Date.now() + 5 * 60 * 1000),
    });

    return otp;
  }

  async updatePassword(userId: string, oldPass: string, newPass: string) {
    if (oldPass.length < 8 || newPass.length < 8)
      throw new ValidationError("Password must be at least 8 letters");
    const user = await this._repo.findUserById(userId);
    if (!user) throw new NotFoundError("user not found");
    const oldHashedPassword = generateHash(user.salt!, oldPass);
    if (oldHashedPassword !== user.password)
      throw new ValidationError("Invalid Password");
    const newHashedPassword = generateHash(user.salt!, newPass);
    await this._repo.update(userId, { password: newHashedPassword });
    return {
      message: "Password updated successfully",
    };
  }

  async validateToken(token: string) {
    const decodedToken = decodeToken(token);
    if (!decodedToken.id) throw new ValidationError("Invalid Token");
    const user = await this._repo.findUserById(decodedToken.id);
    if (!user) throw new NotFoundError("User not found");
    if (!user.isVerified) {
      throw new ValidationError("Pending Verification");
    }
    const { password, salt, ...rest } = user;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    };
  }

  async forgotPassword(email: string) {
    if (!email) throw new ValidationError("provide email");
    const user = await this._repo.findUserByEmail(email);
    if (!user) throw new NotFoundError("User not found");

    const token = generateSalt();
    const hashToken = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour
    await this._repo.createResetToken(user.id, hashToken, expiresAt);
    const resetUrl = `${config.CLIENT_URL}/reset-password/${token}`;
    return resetUrl;
  }

  async validateResetToken(token: string) {
    if (!token) throw new ValidationError("Provide token");
    const hashedToken = createHash("sha256").update(token).digest("hex");
    const resetToken = await this._repo.findByToken(hashedToken);
    if (!resetToken || resetToken.expiresAt < new Date()) {
      throw new ValidationError("Invalid or Expired token");
    }
  }

  async resetPassword(token: string, password: string) {
    const hashedToken = createHash("sha256").update(token).digest("hex");
    const resetRecord = await this._repo.findByToken(hashedToken);
    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      throw new ValidationError("Invalid or expired token");
    }
    const user = await this._repo.findUserById(resetRecord.userId);
    if (!user) throw new NotFoundError("User not found");
    const newHashedPassword = generateHash(user.salt!, password);
    await this._repo.update(resetRecord.userId, {
      password: newHashedPassword,
    });
    await this._repo.deleteToken(resetRecord.id);
    return {
      message: "Password reset completed",
    };
  }

  async userEmailById(userId: string) {
    const user = await this._repo.findUserById(userId);
    if (!user) throw new NotFoundError("User not found");
    return {
      email: user.email,
      username: user.username,
    };
  }
}
