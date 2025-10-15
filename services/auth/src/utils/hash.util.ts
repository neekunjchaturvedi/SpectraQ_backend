import { createHmac, randomBytes } from 'crypto';
export const generateHash = (salt: string, password: string) => {
  return createHmac('sha256', salt).update(password).digest('hex');
};

export const generateSalt = () => {
  return randomBytes(36).toString('hex');
};
