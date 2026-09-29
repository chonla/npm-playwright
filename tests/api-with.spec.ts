import type { APIRequestContext } from '@playwright/test';
import { ApiWith, step } from '../dist';
import { test, expect, expectSteps } from './api-fixtures';

abstract class Pagination {
  abstract readonly request: APIRequestContext;

  @step('Fetch Page ${page} Of ${path}')
  async fetchPage(path: string, page: number) {
    return this.request.get(path, { params: { page } });
  }
}

interface ProductsApi extends Pagination {}
@ApiWith(Pagination)
class ProductsApi {
  constructor(readonly request: APIRequestContext) {}
}

test('mixes methods into an API client and labels their steps with the client', async ({ api }) => {
  expectSteps('Products Api › Fetch Page 2 Of /api/products');
  const response = await new ProductsApi(api).fetchPage('/api/products', 2);
  expect(response.status()).toBe(200);
  expect((await response.json()).pageNumber).toBe(2);
});

test('a member that already exists on the API client throws', () => {
  expect(() => {
    @ApiWith(Pagination)
    class OrdersApi {
      constructor(readonly request: APIRequestContext) {}
      async fetchPage() {}
    }
  }).toThrow('@ApiWith(Pagination) on OrdersApi: "fetchPage" already exists on the API client — rename one of them');
});
