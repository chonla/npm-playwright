import type { APIRequestContext, APIResponse } from '@playwright/test';
import { Delete, Get, Head, Patch, Post, Put, declared, step } from '../dist';
import { test, expect, expectSteps, attachmentText } from './api-fixtures';

type Credential = { login: string; password: string };

class ShopApi {
  constructor(readonly request: APIRequestContext) {}

  @Get('/api/products/${sku}')
  productBySku(sku: string): Promise<APIResponse> { return declared(); }

  @Get('/api/products', { params: 'query' })
  products(query: { page: number }): Promise<APIResponse> { return declared(); }

  @step('Login As ${credential.login}')
  @Post('/api/auth', { data: 'credential' })
  login(credential: Credential): Promise<APIResponse> { return declared(); }

  @Post('/api/echo', { form: 'fields' })
  postForm(fields: Record<string, string>): Promise<APIResponse> { return declared(); }

  @Put('/api/echo', { data: 'body', headers: { authorization: 'Bearer ${token}' } })
  put(body: unknown, token: string): Promise<APIResponse> { return declared(); }

  @Patch('/api/echo', { data: 'body' })
  patch(body: unknown): Promise<APIResponse> { return declared(); }

  @Delete('/api/echo')
  remove(): Promise<APIResponse> { return declared(); }

  @Head('/api/echo')
  head(): Promise<APIResponse> { return declared(); }

  notDecorated(): Promise<APIResponse> { return declared(); }
}

test('@Get fills and URL-encodes path placeholders; the step shows method and path', async ({ api }) => {
  expectSteps('Shop Api › GET /api/products/000%2F03');
  const response = await new ShopApi(api).productBySku('000/03');
  expect(response.status()).toBe(200);
  expect((await response.json()).title).toBe('Slash Sku');
});

test('params sends a parameter as the query string, shown in the step and attachment', async ({ api }) => {
  expectSteps('Shop Api › GET /api/products?page=2');
  const response = await new ShopApi(api).products({ page: 2 });
  expect((await response.json()).pageNumber).toBe(2);
  expect(attachmentText('GET /api/products?page=2 → 200')).toContain('"pageNumber": 2');
});

test('a @step above an endpoint nests the HTTP step under the business step', async ({ api }) => {
  expectSteps('Shop Api › Login As customer1', 'Shop Api › POST /api/auth');
  const response = await new ShopApi(api).login({ login: 'customer1', password: 'password' });
  expect(response.status()).toBe(200);
});

test('form, data and header templates are sent as declared', async ({ api }) => {
  const shop = new ShopApi(api);
  const form = await (await shop.postForm({ a: '1' })).json();
  const put = await (await shop.put({ b: 2 }, 't0k3n')).json();
  const patch = await (await shop.patch({ c: 3 })).json();
  const del = await (await shop.remove()).json();
  expect(form).toMatchObject({ method: 'POST', contentType: 'application/x-www-form-urlencoded', body: 'a=1' });
  expect(put).toMatchObject({ method: 'PUT', authorization: 'Bearer t0k3n', body: '{"b":2}' });
  expect(patch).toMatchObject({ method: 'PATCH', body: '{"c":3}' });
  expect(del).toMatchObject({ method: 'DELETE' });
  expect((await shop.head()).status()).toBe(200);
});

test('the exchange is attached to the step, with secrets redacted', async ({ api }) => {
  await new ShopApi(api).login({ login: 'customer1', password: 'password' });
  const text = attachmentText('POST /api/auth → 200');
  expect(text).toContain('"login": "customer1"');
  expect(text).toContain('"password": "•••"');
  expect(text).toContain('"token": "•••"');
  expect(text).toContain('set-cookie: •••');
  expect(text).not.toContain('abc.def.ghi');
  expect(text).not.toContain('"password": "password"');
});

test('a header placeholder holding a token is redacted in the attachment', async ({ api }) => {
  await new ShopApi(api).put({ b: 2 }, 't0k3n');
  const text = attachmentText('PUT /api/echo → 200');
  expect(text).toContain('authorization: •••');
  expect(text).not.toContain('t0k3n');
});

test('an option naming a parameter that does not exist throws when the class is defined', () => {
  expect(() => {
    class BadApi {
      constructor(readonly request: APIRequestContext) {}
      @Post('/api/auth', { data: 'credentail' })
      login(credential: Credential): Promise<APIResponse> { return declared(); }
    }
  }).toThrow('@Post(\'/api/auth\'): "credentail" is not a parameter of this method (credential)');
});

test('a path placeholder that is not a parameter throws when the class is defined', () => {
  expect(() => {
    class BadApi {
      constructor(readonly request: APIRequestContext) {}
      @Get('/api/products/${skew}')
      bySku(sku: string): Promise<APIResponse> { return declared(); }
    }
  }).toThrow('@Get(\'/api/products/${skew}\'): "skew" is not a parameter of this method (sku)');
});

test('calling an endpoint method without a decorator explains what is missing', async ({ api }) => {
  expect(() => new ShopApi(api).notDecorated()).toThrow(/no @Get\/@Post\/@Put\/@Patch\/@Delete\/@Head decorator/);
});
