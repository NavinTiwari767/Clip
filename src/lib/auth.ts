import { cookies } from 'next/headers';
import crypto from 'crypto';
import { isAdminEmail } from './db';

const SESSION_SECRET = process.env.SESSION_SECRET || 'clip-track-super-secret-key-2026-denseai';
const COOKIE_NAME = 'clip_session';

export interface SessionUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  full_name?: string;
}

export function signToken(payload: SessionUser): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('hex');
  return `${data}.${signature}`;
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(data)
      .digest('hex');

    if (signature !== expectedSignature) return null;

    const parsed = JSON.parse(Buffer.from(data, 'base64').toString('utf-8')) as SessionUser;
    
    // Always dynamically ensure role reflects the 4 admin emails
    parsed.role = isAdminEmail(parsed.email) ? 'admin' : 'user';
    return parsed;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSession(user: SessionUser) {
  const cookieStore = cookies();
  const token = signToken(user);
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSession() {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
