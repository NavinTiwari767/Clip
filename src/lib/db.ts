import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

// Singleton pool instance across hot reloads in Next.js
declare global {
  // eslint-disable-next-line no-var
  var __postgres_pool: pg.Pool | undefined;
}

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.ixrsdsidhklzyqejvyxe:1zsP2NgrXKtOpoJi@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';

export const pool: pg.Pool =
  global.__postgres_pool ||
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__postgres_pool = pool;
}

export const ADMIN_EMAILS = (
  process.env.ADMIN_EMAILS ||
  'anikeshaman@denseai.co,arpita@denseai.com,aditya@denseai.com,navintiwari@denseai.com'
)
  .split(',')
  .map((e) => e.trim().toLowerCase());

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function hashPassword(password: string): string {
  const salt = 'clip_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
