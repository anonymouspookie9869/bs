import { db } from './index.ts';
import { users, type UserRow } from './schema.ts';

const DEFAULT_ADMIN_EMAILS = [
  'shivam8055v4@gmail.com',
  'bhuvichauhan01@gmail.com',
];

export function isConfiguredAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const extraAdmins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return (
    DEFAULT_ADMIN_EMAILS.includes(normalized) ||
    extraAdmins.includes(normalized)
  );
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  name: string,
): Promise<UserRow> {
  const normalizedEmail = email.trim().toLowerCase();
  const resolvedRole = isConfiguredAdminEmail(normalizedEmail) ? 'admin' : 'viewer';

  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        name: name.trim(),
        role: resolvedRole,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          name: name.trim(),
          ...(resolvedRole === 'admin' ? { role: 'admin' } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Unable to verify account profile right now. Please try again later.', {
      cause: error,
    });
  }
}
