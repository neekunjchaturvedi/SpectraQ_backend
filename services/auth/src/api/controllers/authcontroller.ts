import { Request, Response, NextFunction } from "express";
import { ValidationError } from "../../utils/error";
import { AuthService } from "../../service/auth.service";
import { AuthRepository } from "../../repository/auth.repository";
import { generateToken } from "../../utils";

import { RabbitMQQueues } from "../../interfaces";
import { publishToQueue } from "../../messaging/publisher";

const authService = new AuthService(new AuthRepository());

const register = async (req: Request, res: Response, next: NextFunction) => {
  const { role, email, password, mobileNumber, firstName, lastName, username } =
    req.body;

  if (
    !role ||
    !email ||
    !password ||
    !mobileNumber ||
    !firstName ||
    !lastName ||
    !username
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const name = `${firstName} ${lastName}`;
    const { message, userId } = await authService.register({
      email,
      password,
      role,
      mobileNumber,
      username,
      name,
    });

    if (!message || !userId) {
      return res
        .status(500)
        .json({ error: "Something went wrong during registration" });
    }
    publishToQueue(RabbitMQQueues.EMAIL_QUEUE, {
      userId: userId,
      templateType: "OTP",
      data: {
        name: name,
        otp: await authService.generateAndStoreOtp(email),
      },
      email,
    });
    res.status(201).json({ message });
  } catch (error) {
    return next(error);
  }
};

const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Missing Fields!" });
    return;
  }

  try {
    const data = await authService.login(email, password);

    if (!data.verified) {
      publishToQueue(RabbitMQQueues.EMAIL_QUEUE, {
        userId: data.id,
        templateType: "OTP",
        data: {
          name: data.username, // Use username as fallback
          otp: await authService.generateAndStoreOtp(email),
        },
        email,
      });

      res.status(200).json({
        message: "An OTP has been sent to your email. Please Verify!",
      });
      return;
    }

    const token = generateToken(data as any, "10d");
    res.status(200).json({ user: data, token });
  } catch (error) {
    return next(error);
  }
};

const verify = async (req: Request, res: Response, next: NextFunction) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    res.status(400).json({ error: "Missing Fields!" });
    return;
  }

  try {
    await authService.verify(email, otp);
    res.status(200).json({ message: "User verified" });
  } catch (error) {
    return next(error);
  }
};

const resendOtp = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email is missing!" });
    return;
  }

  try {
    const otp = await authService.generateAndStoreOtp(email);

    // Get user details for the name
    const user = await authService.userEmailById(
      (
        await authService.login(email, "")
      ).id // This is a hack, you might want to create a separate method
    );

    publishToQueue(RabbitMQQueues.EMAIL_QUEUE, {
      userId: null,
      templateType: "OTP",
      data: {
        name: user.username || "User", // Use username or fallback
        otp: otp,
      },
      email,
    });

    res.status(200).json({
      message: "An OTP has been sent to your email. Please Verify!",
    });
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    res.status(400).json({ error: "Missing password fields!" });
    return;
  }

  try {
    const data = await authService.updatePassword(
      req.user!.id,
      oldPassword,
      newPassword
    );
    res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const validateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeaders = req.headers["authorization"];

  try {
    if (!authHeaders) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const token = authHeaders.split(" ")[1];
    if (!token) {
      res.status(401).json({ error: "Token not provided" });
      return;
    }

    const user = await authService.validateToken(token);
    res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: "Provide email" });
    return;
  }

  try {
    const link = await authService.forgotPassword(email);

    if (!link || typeof link !== "string") {
      res.status(500).json({ error: "Failed to generate reset link" });
      return;
    }

    publishToQueue(RabbitMQQueues.EMAIL_QUEUE, {
      userId: null,
      templateType: "RESET_PASSWORD",
      data: {
        link: link, // Use the already generated link, don't call the service again
      },
      email,
    });

    res.status(200).json({ message: "Reset link sent to your email" });
  } catch (error) {
    return next(error);
  }
};

const validateResetToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ error: "Token is required" });
      return;
    }

    await authService.validateResetToken(token);
    res.status(200).json({ message: "Token is valid" });
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      res.status(400).json({ error: "Token is required" });
      return;
    }

    if (!password) {
      res.status(400).json({ error: "Password is required" });
      return;
    }

    await authService.resetPassword(token, password);
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    return next(error);
  }
};

const userDetails = async (req: Request, res: Response, next: NextFunction) => {
  const { username } = req.params;

  if (!username) {
    res.status(400).json({ error: "Missing username" });
    return;
  }

  try {
    const user = await authService.userByUsername(username, req.user!.id);
    res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

const userEmailById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }

    const data = await authService.userEmailById(userId);
    res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

export const AuthController = {
  register,
  login,
  verify,
  resendOtp,
  changePassword,
  validateToken,
  forgotPassword,
  validateResetToken,
  resetPassword,
  userDetails,
  userEmailById,
};
