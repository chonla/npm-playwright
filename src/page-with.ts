import type { Page } from '@playwright/test';

/** Any class whose instances expose the Playwright `page` — i.e. a page object. */
export type PageObjectClass = abstract new (...args: any[]) => { readonly page: Page };

/** Any class used as a mixin: its prototype getters and methods get copied. */
export type MixinClass = abstract new (...args: any[]) => object;

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
    for (const mixin of mixins) {
      for (const key of Object.getOwnPropertyNames(mixin.prototype)) {
        if (key === 'constructor') continue;
        if (key in target.prototype) {
          throw new Error(`@PageWith(${mixin.name}) on ${target.name}: "${key}" already exists on the page object — rename one of them`);
        }
        Object.defineProperty(target.prototype, key, Object.getOwnPropertyDescriptor(mixin.prototype, key)!);
      }
    }
  };
}
