# Changelog

## 0.2.0

### Breaking

- `@step` labels are now a breadcrumb: `Login Page › Login With alice` (was `In Login Page, Login With alice`). It reads the same for page objects, mixins and helper classes (`Session › Sign In As alice`), and matches the `›` Playwright uses between test titles. Update any report parsing or snapshot that matched the old format.

## 0.1.1

- Export `./package.json` so tools can read the version and peer dependencies.

## 0.1.0

- `@step`: business-readable `test.step` labels with `${param.path}` title placeholders.
- `@PageWith`: mix shared UI into page objects; name clashes throw.
