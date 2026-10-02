# Changelog

## 0.3.1

- Attachments no longer mask keys that merely end in "pass" (`bypass`, `compass`). `pass`, `userPass`, `db_pass` and `passphrase` are still masked.

## 0.3.0

- `@ApiWith(...mixins)`: `@PageWith` for API clients (classes with `request: APIRequestContext`).
- `@Get` `@Post` `@Put` `@Patch` `@Delete` `@Head`: declared requests with `${param}` path placeholders (URL-encoded) and `data` / `form` / `params` / `headers` options. Misspelled parameter names throw when the class is defined.
- Request/response attachments: endpoint steps, and `@step` methods returning an `APIResponse`, attach the exchange to the report with secrets redacted.
- `parseBody(response, schema)`: validates a JSON body with any Standard Schema library (zod, valibot, arktype) and returns it typed.
- Stacked decorators (`@step` above `@Post`) keep the original method's parameter names.

## 0.2.0 (not published — shipped as part of 0.3.0)

### Breaking

- `@step` labels are now a breadcrumb: `Login Page › Login With alice` (was `In Login Page, Login With alice`). It reads the same for page objects, mixins and helper classes (`Session › Sign In As alice`), and matches the `›` Playwright uses between test titles. Update any report parsing or snapshot that matched the old format.

## 0.1.1

- Export `./package.json` so tools can read the version and peer dependencies.

## 0.1.0

- `@step`: business-readable `test.step` labels with `${param.path}` title placeholders.
- `@PageWith`: mix shared UI into page objects; name clashes throw.
