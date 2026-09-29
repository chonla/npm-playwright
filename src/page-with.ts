import type { Page } from '@playwright/test';
import { mixInto, type MixinClass } from './mixin';

export type { MixinClass } from './mixin';

/** Any class whose instances expose the Playwright `page` — i.e. a page object. */
export type PageObjectClass = abstract new (...args: any[]) => { readonly page: Page };

/**
 * Class decorator that copies the getters and methods of each mixin onto the page object:
 * `@PageWith(Header) class CartPage extends BasePage {}`.
 *
 * Pair it with an interface merge so TypeScript sees the mixed-in members:
 * `export interface CartPage extends Header {}`.
 *
 * Only the mixin's own prototype members are copied — no instance fields, no members inherited by the mixin.
 * A member that already exists on the page object (or came from an earlier mixin) throws instead of being overwritten.
 */
export function PageWith(...mixins: MixinClass[]) {
  return function <T extends PageObjectClass>(target: T, _context: ClassDecoratorContext<T>): void {
    mixInto('PageWith', 'page object', target, mixins);
  };
}
