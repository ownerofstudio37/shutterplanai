import { User } from '@/types';

export interface MockStoredUser extends User {
  password: string;
}

const demoUser: MockStoredUser = {
  id: 'demo-user',
  email: 'demo@shutterplan.ai',
  name: 'Demo User',
  role: 'user',
  password: 'Demo123!',
  createdAt: new Date('2026-06-10T00:00:00.000Z'),
  updatedAt: new Date('2026-06-10T00:00:00.000Z'),
};

const users: Record<string, MockStoredUser> = {
  [demoUser.email]: demoUser,
};

export const DEMO_CREDENTIALS = {
  email: demoUser.email,
  password: demoUser.password,
};

export function findUserByEmail(email: string) {
  return users[email.toLowerCase()] ?? null;
}

export function toPublicUser(user: MockStoredUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function createUser(email: string, password: string, name: string): User {
  const normalizedEmail = email.toLowerCase();

  const user: MockStoredUser = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name,
    role: 'user',
    password,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  users[normalizedEmail] = user;
  return toPublicUser(user);
}

export function createMockToken(email: string) {
  return Buffer.from(
    JSON.stringify({
      email: email.toLowerCase(),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    })
  ).toString('base64');
}

export function getUserFromToken(token: string) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as {
      email?: string;
      exp?: number;
    };

    if (!decoded.email || !decoded.exp || decoded.exp * 1000 < Date.now()) {
      return null;
    }

    return findUserByEmail(decoded.email);
  } catch {
    return null;
  }
}
