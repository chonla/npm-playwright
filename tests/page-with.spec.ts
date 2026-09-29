import { test, expect, type Page } from '@playwright/test';
import { PageWith, step } from '../dist';

abstract class BasePage {
  constructor(readonly page: Page) {}
}

abstract class Header {
  abstract readonly page: Page;
  get cartLabel() { return `cart on ${(this.page as any).name}`; }
  @step()
  async openCart() { return 'opened'; }
}

abstract class SideMenu {
  abstract readonly page: Page;
  menuItems() { return ['Store', 'Log Out']; }
}

interface StorePage extends Header, SideMenu {}
@PageWith(Header, SideMenu)
class StorePage extends BasePage {}

const page = { name: 'fake page' } as unknown as Page;

test('mixes getters and methods from every mixin into the page object', async () => {
  const store = new StorePage(page);
  expect(store.cartLabel).toBe('cart on fake page');
  expect(store.menuItems()).toEqual(['Store', 'Log Out']);
  expect(await store.openCart()).toBe('opened');
});

test('@step on a mixed-in method is labelled with the page, not the mixin', async () => {
  test.info().annotations.push({ type: 'expected-step', description: 'In Store Page, Open Cart' });
  await new StorePage(page).openCart();
});

test('a member that already exists on the page object throws instead of being overwritten', () => {
  expect(() => {
    @PageWith(Header)
    class CartPage extends BasePage {
      get cartLabel() { return 'mine'; }
    }
  }).toThrow('@PageWith(Header) on CartPage: "cartLabel" already exists on the page object — rename one of them');
});

test('the same member coming from two mixins throws', () => {
  abstract class OtherHeader { get cartLabel() { return 'other'; } }
  expect(() => {
    @PageWith(Header, OtherHeader)
    class CheckoutPage extends BasePage {}
  }).toThrow(/"cartLabel" already exists/);
});
