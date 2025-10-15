import config from '../config';
import { ValidationError } from './error';
import jwt, { SignOptions } from 'jsonwebtoken';

interface JWTTokenPayload {
  id: string;
  email: string;
  role: string;
}
interface JWTDecodedToken extends JWTTokenPayload {
  iat: number;
  exp: number;
}
export const generateToken = (
  payload: JWTTokenPayload,
  expiresIn?: SignOptions['expiresIn']
): string => {
  const options: SignOptions = expiresIn ? { expiresIn } : {};

  return jwt.sign(
    payload,
    config.JWT_SECRET as string, // ⬅️ Ensure it's treated as string
    options
  );
};
export const decodeToken = (token: string) => {
  try {
    return jwt.verify(token, config.JWT_SECRET!) as JWTDecodedToken;
  } catch (error) {
    throw new ValidationError('Token Expired or Invalid');
  }
};
