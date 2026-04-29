#!/usr/bin/env node
/**
 * Encrypt case study HTML for password-protect.js (AES-256-GCM + PBKDF2 100k).
 * Format matches password-protect.js: base64(salt32 || iv16 || ciphertext+tag).
 *
 * Usage:
 *   PASSWORD='same-as-norton' node scripts/encrypt-password-payload.mjs path/to/plain.html
 *   node scripts/encrypt-password-payload.mjs path/to/plain.html 'your-password'
 *
 * Use the same password as Norton.html so one password unlocks both case studies.
 */
import fs from 'fs';
import crypto from 'crypto';

const plainPath = process.argv[2];
const password = process.argv[3] || process.env.PASSWORD || '';

if (!plainPath || !password) {
  console.error(
    'Usage: PASSWORD=secret node scripts/encrypt-password-payload.mjs <plain.html>\n' +
      "   or: node scripts/encrypt-password-payload.mjs <plain.html> 'secret'"
  );
  process.exit(1);
}

const html = fs.readFileSync(plainPath, 'utf8');
const salt = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([
  cipher.update(html, 'utf8'),
  cipher.final(),
  cipher.getAuthTag(),
]);

const combined = Buffer.concat([salt, iv, encrypted]);
process.stdout.write(combined.toString('base64'));
