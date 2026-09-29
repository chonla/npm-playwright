# @chonla/playwright

Readable page objects and API clients for [Playwright](https://playwright.dev):

- **`@step`** turns page-object and API-client methods into business-readable report steps: `Login Page › Login With alice`.
- **`@PageWith`** mixes UI shared across pages (header, side menu, cart button) into page objects: `@PageWith(Header) class CartPage`.
- **`@ApiWith`** does the same for API clients: `@ApiWith(Pagination) class ProductsApi`.
- **`@Get` `@Post` `@Put` `@Patch` `@Delete` `@Head`** declare API requests; every request and response is attached to its report step, with secrets redacted.
- **`parseBody`** validates a response body with zod (or any [Standard Schema](https://standardschema.dev) library) and returns it typed.

```
✓ removing the only item empties the cart
  ├ Login Page › Open
  ├ Login Page › Login With standard_user
  ├ Inventory Page › Add Sauce Labs Backpack To Cart
  ├ Inventory Page › Open Cart
  ├ Cart Page › Remove Sauce Labs Backpack
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

  @step()                                     // → "Login Page › Open"
  async open() {
    await this.page.goto('/');
  }

  @step('Login With ${credential.username}')  // → "Login Page › Login With alice"
  async loginWith(credential: { username: string; password: string }) {
    await this.page.getByLabel('Username').fill(credential.username);
    await this.page.getByLabel('Password').fill(credential.password);
    await this.page.getByRole('button', { name: 'Login' }).click();
  }
}
```

- **Label** is `<Class Name> › <action>`, a breadcrumb that matches the `›` Playwright uses between test titles, with camelCase split into words. Without a title the action is the method name (`loginWith` → `Login With`), so name methods the way a reader would say them.
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

// cartPage.cartBadge, cartPage.openCart() → report step "Cart Page › Open Cart"
```

- Apply several: `@PageWith(Header, SideMenu)` with `interface CartPage extends Header, SideMenu {}`. **Both lines are needed** — the decorator adds members at runtime, the interface tells TypeScript.
- **Name clashes throw** when the class is defined — a member already on the page object, or the same member from two mixins — instead of one silently winning.
- The decorated class must have a `page` property (checked by the types).
- Declare `page` in a mixin as `abstract readonly page: Page`, not `declare readonly page: Page` — Playwright's TypeScript transform before 1.61 rejects `declare` fields in decorated files.
- Mixins contribute their **own getters and methods** only:
  - instance fields (`readonly x = this.page...`) are not copied → use getters;
  - members a mixin inherits are not copied → apply both mixins instead of making one extend the other.

## API clients

### `@Get` / `@Post` / `@Put` / `@Patch` / `@Delete` / `@Head`

```ts
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { Get, Post, declared, step } from '@chonla/playwright';

export class StoreApi {
  constructor(readonly request: APIRequestContext) {}

  @Get('/api/products/${sku}')                         // → "Store Api › GET /api/products/0000000001"
  productBySku(sku: string): Promise<APIResponse> { return declared(); }

  @Get('/api/products', { params: 'query' })           // query → ?page=2
  products(query: { page: number }): Promise<APIResponse> { return declared(); }

  @step('Login As ${credential.login}')                // optional business step around the request
  @Post('/api/auth', { data: 'credential' })           // credential → JSON body
  login(credential: { login: string; password: string }): Promise<APIResponse> { return declared(); }
}
```

- The decorator makes the request through the class's `request` (an `APIRequestContext`); the method body is just `return declared()`, which throws if the decorator is ever removed.
- `${param.path}` placeholders in the path are filled from the arguments and URL-encoded.
- Options name the parameter to send: `data` (JSON body), `form` (form-encoded body), `params` (query string). `headers` values may use placeholders: `{ headers: { authorization: 'Bearer ${token}' } }`.
- A misspelled parameter name in the path or options throws **when the class is defined**, not on first call.
- Stack `@step` above an endpoint to give it a business name; the HTTP step nests under it.

### Request and response in the report

Every endpoint step gets an attachment named `POST /api/auth → 200` with the request (headers, query, body) and the response (status, headers, body). A hand-written `@step` method that returns an `APIResponse` gets the response part (Playwright's response doesn't expose the request method or body):

```
POST http://localhost/api/auth → 200 OK

Request body (JSON):
{ "login": "customer1", "password": "•••" }

Response headers:
content-type: application/json
set-cookie: •••

Response body:
{ "token": "•••", "user": "customer1" }
```

Secrets are always masked: the `Authorization`, `Proxy-Authorization`, `Cookie`, `Set-Cookie` and API-key headers, and JSON fields whose names look like passwords, secrets, tokens, API keys or credentials, at any depth. Bodies over 20,000 characters are truncated. On Playwright ≥ 1.51 the attachment sits on the step; on older versions, on the test.

### `@ApiWith`

```ts
import type { APIRequestContext } from '@playwright/test';
import { ApiWith, step } from '@chonla/playwright';

export abstract class Pagination {
  abstract readonly request: APIRequestContext;

  @step('Fetch Page ${page} Of ${path}')
  fetchPage(path: string, page: number) {
    return this.request.get(path, { params: { page } });
  }
}

export interface ProductsApi extends Pagination {}
@ApiWith(Pagination)
export class ProductsApi {
  constructor(readonly request: APIRequestContext) {}
}
// productsApi.fetchPage('/api/products', 2) → "Products Api › Fetch Page 2 Of /api/products"
```

Same rules as `@PageWith`: the client needs a `request` property, mixins contribute their own getters and methods, and name clashes throw.

### `parseBody`

```ts
import { z } from 'zod';
import { parseBody } from '@chonla/playwright';

const Product = z.object({ sku: z.string(), title: z.string(), price: z.number() });

// Act
const response = await storeApi.productBySku('0000000001');

// Assert
expect(response.status()).toBe(200);
const product = await parseBody(response, Product);     // typed as { sku: string; title: string; price: number }
expect(product.price).toBe(79.69);
```

Works with any [Standard Schema](https://standardschema.dev) validator — zod ≥ 3.24, valibot, arktype — with no extra dependency. A mismatch throws with every issue and its path:

```
Response 200 from /api/products?page=1 does not match the schema:
  total: Invalid input: expected string, received number
  data.0.price: Invalid input: expected string, received number
```

### ESLint

`@typescript-eslint/no-unsafe-declaration-merging` (in the `recommended` config) flags the `interface X` + `class X` pair that `@PageWith` and `@ApiWith` rely on. Turn it off for page objects and API clients:

```js
// eslint.config.js
{ files: ['pages/**/*.ts', 'apis/**/*.ts'], rules: { '@typescript-eslint/no-unsafe-declaration-merging': 'off' } }
```

## License

MIT
