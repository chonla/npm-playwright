import type { APIRequestContext } from '@playwright/test';
import { mixInto, type MixinClass } from './mixin';

/** Any class whose instances expose a Playwright `request` context — i.e. an API client. */
export type ApiClientClass = abstract new (...args: any[]) => { readonly request: APIRequestContext };

/**
 * Class decorator that copies the getters and methods of each mixin onto the API client:
 * `@ApiWith(Pagination) class ProductsApi {}`.
 *
 * Pair it with an interface merge so TypeScript sees the mixed-in members:
 * `export interface ProductsApi extends Pagination {}`.
 *
 * Same rules as `@PageWith`: own getters and methods only, and name clashes throw.
 */
export function ApiWith(...mixins: MixinClass[]) {
  return function <T extends ApiClientClass>(target: T, _context: ClassDecoratorContext<T>): void {
    mixInto('ApiWith', 'API client', target, mixins);
  };
}
