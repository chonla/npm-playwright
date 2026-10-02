import { test, expect } from '@playwright/test';
import { redactJson } from '../dist/redact';

test('masks secret-looking keys but not words that merely end in "pass"', () => {
  const keys = ['password', 'newPassword', 'user_passwd', 'passphrase', 'pass', 'userPass', 'db-pass', 'token', 'bypass', 'compass', 'passenger'];
  const masked = redactJson(Object.fromEntries(keys.map((k) => [k, 'x']))) as Record<string, string>;
  expect(Object.keys(masked).filter((k) => masked[k] === '•••')).toEqual(['password', 'newPassword', 'user_passwd', 'passphrase', 'pass', 'userPass', 'db-pass', 'token']);
});
