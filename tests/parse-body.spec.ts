import { z } from 'zod';
import { parseBody } from '../dist';
import { test, expect } from './api-fixtures';

const Product = z.object({ sku: z.string(), title: z.string(), price: z.number() });
const ProductPage = z.object({ total: z.number(), pageSize: z.number(), pageNumber: z.number(), data: z.array(Product) });

test('returns the typed, validated body', async ({ api }) => {
  const page = await parseBody(await api.get('/api/products?page=1'), ProductPage);
  expect(page.data.map((p) => p.sku)).toEqual(['0000000001', '0000000002']);
});

test('lists every schema issue with its path, plus status and URL', async ({ api }) => {
  const Wrong = z.object({ total: z.string(), data: z.array(z.object({ price: z.string() })) });
  const response = await api.get('/api/products?page=1');
  const error = await parseBody(response, Wrong).catch((e: Error) => e);
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toContain('Response 200 from /api/products?page=1 does not match the schema:');
  expect((error as Error).message).toContain('total:');
  expect((error as Error).message).toContain('data.0.price:');
  expect((error as Error).message).toContain('data.1.price:');
});

test('a body that is not JSON fails with the text it got', async ({ api }) => {
  const error = await parseBody(await api.get('/api/text'), Product).catch((e: Error) => e);
  expect((error as Error).message).toContain('is not JSON');
  expect((error as Error).message).toContain('not json');
});
