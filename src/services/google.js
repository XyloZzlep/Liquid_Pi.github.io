import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';

export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

const redirectUri = `${env.PUBLIC_URL.replace(/\/$/, '')}/api/auth/google/callback`;
const client = googleEnabled
  ? new OAuth2Client({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri,
    })
  : null;

export async function startAuth() {
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  const state = crypto.randomBytes(24).toString('hex');
  const url = client.generateAuthUrl({
    scope: ['openid', 'email', 'profile'],
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return { url, state, codeVerifier };
}

export async function profileFromCode(code, codeVerifier) {
  const { tokens } = await client.getToken({ code, codeVerifier });
  if (!tokens.id_token) throw new Error('Google no devolvió id_token');
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const p = ticket.getPayload();
  return {
    sub: p.sub,
    email: p.email ? p.email.toLowerCase() : null,
    emailVerified: p.email_verified === true,
    name: p.name ?? null,
  };
}