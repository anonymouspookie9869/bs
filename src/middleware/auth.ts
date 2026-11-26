import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';
import type { UserRow } from '../db/schema.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: UserRow;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token || token.length > 8192) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  let decodedToken: DecodedIdToken;
  try {
    // Cryptographically verifies Firebase RS256 signature, issuer, audience, and expiry
    // against Google's public certs without requiring a separate IAM service account key.
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (error) {
    console.error(
      'Auth token verification failed:',
      error instanceof Error ? error.message : 'invalid token',
    );
    res
      .status(401)
      .json({ error: 'Invalid or expired session. Please sign in again.' });
    return;
  }

  if (!decodedToken.email || decodedToken.email_verified !== true) {
    res.status(403).json({
      error:
        'A verified email address is required to access administrator tools.',
    });
    return;
  }

  req.user = decodedToken;
  const displayName =
    typeof decodedToken.name === 'string' ? decodedToken.name : '';

  try {
    req.dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email,
      displayName,
    );
    next();
  } catch (error) {
    console.error(
      'Admin profile lookup failed:',
      error instanceof Error ? error.message : 'db error',
    );
    res.status(500).json({
      error: 'Could not verify your account right now. Please try again.',
    });
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.dbUser || req.dbUser.role !== 'admin') {
    res.status(403).json({
      error:
        'Admin access required. This account does not have permission to view inquiries.',
    });
    return;
  }
  next();
};
