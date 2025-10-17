import { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ValidationError } from "../../utils/error";
import { AuthService } from "../../service/auth.service";
import { AuthRepository } from "../../repository/auth.repository";
import { decodeToken } from "../../utils";
const authService = new AuthService(new AuthRepository());
export const UserAuthorizer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const headers = req.headers.authorization;
    if (!headers) {
      throw new UnauthorizedError();
    }
    const token = headers.split(" ")[1];
    const decodedToken = decodeToken(token);
    const user = await authService.userDetails(decodedToken.id);
    if (!user) throw new ValidationError("User not found");
    req.user = user;
    next();
  } catch (error) {
    return next(error);
  }
};
