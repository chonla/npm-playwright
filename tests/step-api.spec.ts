import type { APIRequestContext } from '@playwright/test';
import { step } from '../dist';
import { test, expect, attachmentText } from './api-fixtures';

class AuthApi {
  constructor(readonly request: APIRequestContext) {}

  @step('Login As ${login}')
  async login(login: string, password: string) {
    return this.request.post('/api/auth', { data: { login, password } });
  }

  @step()
  async products() {
    return (await this.request.get('/api/products')).json();
  }
}

test('a hand-written @step returning an APIResponse attaches the response to the step', async ({ api }) => {
  const response = await new AuthApi(api).login('customer1', 'password');
  expect(response.status()).toBe(200);
  const text = attachmentText('/api/auth → 200');
  expect(text).toContain('"user": "customer1"');
  expect(text).toContain('"token": "•••"');
  expect(text).toContain('set-cookie: •••');
});

test('a @step returning something else attaches nothing', async ({ api }) => {
  await new AuthApi(api).products();
  expect(test.info().attachments.filter((a) => a.name.includes('→'))).toHaveLength(0);
});
