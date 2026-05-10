#!/usr/bin/env node
/**
 * Verify that a passphrase decrypts a password-protect payload (CLI parity check).
 * Same layout as password-protect.js / encrypt-password-payload.mjs: salt32 || iv16 || ciphertext||tag.
 *
 * Usage:
 *   node scripts/verify-password-payload.mjs <plain.html> <password-or-shell-with-div.html>
 *   PASSWORD=secret node scripts/verify-password-payload.mjs Norton-case-study-plain.html Norton.html
 *
 * Exits 0 only when decrypted bytes equal plain.html exactly (UTF-8).
 */
import fs from 'fs';
import crypto from 'crypto';

const plainPath = process.argv[2];
const payloadSourcePath = process.argv[3];
const password = process.argv[4] || process.env.PASSWORD || '';

if (!plainPath || !payloadSourcePath || !password) {
  console.error(
    'Usage: PASSWORD=secret node scripts/verify-password-payload.mjs <plain.html> <Norton-or-API.html>\n' +
      "   or: node scripts/verify-password-payload.mjs <plain.html> <shell.html> 'secret'"
  );
  process.exit(1);
}

function extractPayload(html) {
  const m = String(html).match(/id\s*=\s*["']password-protect["'][^>]*data-payload\s*=\s*"([^"]*)"/);
  if (m) return m[1].replace(/\s/g, '');
  const d = String(html).match(/data-payload\s*=\s*"([^"]*)"/);
  if (d) return d[1].replace(/\s/g, '');
  return '';
}

let payload = '';
try {
  const raw = fs.readFileSync(payloadSourcePath, 'utf8');
  payload = extractPayload(raw);
  if (!payload && /^[A-Za-z0-9+/=_-]+$/.test(raw.trim().replace(/\s/g, ''))) {
    payload = raw.trim().replace(/\s/g, '');
  }
} catch (e) {
  console.error(e.message);
  process.exit(2);
}

if (!payload) {
  console.error('Could not find data-payload in', payloadSourcePath);
  process.exit(2);
}

const plainExpected = fs.readFileSync(plainPath, 'utf8');

let combined;
try {
  combined = Buffer.from(payload, 'base64');
} catch {
  console.error('Invalid base64 payload');
  process.exit(2);
}

if (combined.length < 32 + 16 + 16) {
  console.error('Payload too short');
  process.exit(2);
}

const salt = combined.slice(0, 32);
const iv = combined.slice(32, 48);
const encrypted = combined.slice(48);
const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

let decrypted;
try {
  const tag = encrypted.slice(-16);
  const ciphertext = encrypted.slice(0, -16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
} catch (e) {
  console.error('Decrypt failed (wrong password or corrupt payload):', e.message);
  process.exit(3);
}

const got = decrypted.toString('utf8');
if (got === plainExpected) {
  console.log('OK: passphrase decrypts', payloadSourcePath, 'to match', plainPath);
  process.exit(0);
}

console.error('Mismatch: decrypted length', got.length, 'expected', plainExpected.length);
process.exit(4);
