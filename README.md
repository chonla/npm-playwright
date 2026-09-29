# @chonla/playwright

Readable Page Object Model decorators for [Playwright](https://playwright.dev):

- **`@step`** turns page-object methods into business-readable report steps: `In Login Page, Login With alice`.
- **`@PageWith`** mixes UI shared across pages (header, side menu, cart button) into page objects: `@PageWith(Header) class CartPage`.

```
✓ removing the only item empties the cart
  ├ In Login Page, Open
  ├ In Login Page, Login With standard_user
  ├ In Inventory Page, Add Sauce Labs Backpack To Cart
  ├ In Inventory Page, Open Cart
  ├ In Cart Page, Remove Sauce Labs Backpack
  ├ expect(cartPage.items).toHaveCount(0)
```

## Install

```sh
npm i -D @chonla/playwright
```

Requires `@playwright/test` ≥ 1.39 (a peer dependency — the steps are reported by *your* Playwright) and TypeScript ≥ 5.0. It uses standard TS 5 decorators: no `experimentalDecorators`, no Babel config. Works in CommonJS and ESM projects.

## `@step`

```ts
import type { Page } from '@playwright/test';
import { step } from '@chonla/playwright';

export class LoginPage {
  constructor(readonly page: Page) {}

  @step()                                     // → "In Login Page, Open"
  async open() {
    await this.page.goto('/');
  }

  @step('Login With ${credential.username}')  // → "In Login Page, Login With alice"
  async loginWith(credential: { username: string; password: string }) {
    await this.page.getByLabel('Username').fill(credential.username);
    await this.page.getByLabel('Password').fill(credential.password);
    await this.page.getByRole('button', { name: 'Login' }).click();
  }
}
```

- **Label** is `In <Class Name>, <action>`, with camelCase split into words. Without a title the action is the method name (`loginWith` → `Login With`), so name methods the way a reader would say them.
- **Title placeholders** `${param}` / `${param.path}` reference the method's parameter names and are filled when the method is called. Write the title as a **plain quoted string**, not a template literal (backticks). An omitted argument shows its default value (`add(name, quantity = 1)`).
- **Typos fail fast**: `@step('Login With ${credentail.username}')` rejects with `"credentail" is not a parameter of this method (credential)` instead of printing `undefined`.
- **Never put secrets in a title** (`${credential.password}`) — reports and traces get shared. Arguments only appear when you name them.
- Steps are `box`ed, so a failure points at the test line that called the method, not inside the page object.
- Methods must be `async`. Parameter names are read from the method's source, so keep parameters simple: no destructuring in the signature, no defaults containing parentheses or commas.

## `@PageWith`

```ts
import type { Page } from '@playwright/test';
import { PageWith, step } from '@chonla/playwright';

// A mixin: getters and methods only, `page` declared abstract (not assigned).
export abstract class Header {
  abstract readonly page: Page;

  get cartBadge() {
    return this.page.getByTestId('shopping-cart-badge');
  }

  @step()
  async openCart() {
    await this.page.getByTestId('shopping-cart-link').click();
  }
}

export abstract class BasePage {
  constructor(readonly page: Page) {}
}

export interface CartPage extends Header {} // tells TypeScript about the mixed-in members
@PageWith(Header)
export class CartPage extends BasePage {
  get items() {
    return this.page.getByTestId('inventory-item');
  }
}

// cartPage.cartBadge, cartPage.openCart() → report step "In Cart Page, Open Cart"
```

- Apply several: `@PageWith(Header, SideMenu)` with `interface CartPage extends Header, SideMenu {}`. **Both lines are needed** — the decorator adds members at runtime, the interface tells TypeScript.
- **Name clashes throw** when the class is defined — a member already on the page object, or the same member from two mixins — instead of one silently winning.
- The decorated class must have a `page` property (checked by the types).
- Declare `page` in a mixin as `abstract readonly page: Page`, not `declare readonly page: Page` — Playwright's TypeScript transform before 1.61 rejects `declare` fields in decorated files.
- Mixins contribute their **own getters and methods** only:
  - instance fields (`readonly x = this.page...`) are not copied → use getters;
  - members a mixin inherits are not copied → apply both mixins instead of making one extend the other.

### ESLint

`@typescript-eslint/no-unsafe-declaration-merging` (in the `recommended` config) flags the `interface X` + `class X` pair that `@PageWith` relies on. Turn it off for page objects:

```js
// eslint.config.js
{ files: ['pages/**/*.ts'], rules: { '@typescript-eslint/no-unsafe-declaration-merging': 'off' } }
```

## License

MIT
