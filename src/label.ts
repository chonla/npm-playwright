/** "https://host:1/api/x?a=1" → "/api/x?a=1"; anything else is returned as is. */
export const pathOf = (url: string): string => url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, '') || '/';

/** "loginWith" → "Login With", "LoginPage" → "Login Page" */
export const words = (name: string): string =>
  name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

export type Parameter = { name: string; defaultText?: string };

/** Wrappers made by this package carry the wrapped method's parameters, so stacked decorators still see the real names. */
const PARAMETERS = Symbol.for('@chonla/playwright:parameters');

/** Marks `wrapper` as having the same parameters as the method it wraps. */
export const keepParameters = <F extends Function>(wrapper: F, params: Parameter[]): F =>
  Object.defineProperty(wrapper, PARAMETERS, { value: params });

/**
 * Parameters of a function, read from its source:
 * `add(name, quantity = 1)` → [{ name: 'name' }, { name: 'quantity', defaultText: '1' }].
 * Destructured parameters and defaults containing parentheses or commas are not supported.
 */
export const parameters = (fn: Function): Parameter[] =>
  (fn as any)[PARAMETERS] ??
  (fn.toString().match(/\(([^)]*)\)/)?.[1] ?? '')
    .split(',')
    .map((raw) => {
      const [name, defaultText] = raw.replace(/^\s*\.\.\./, '').split('=').map((part) => part.trim());
      return { name, defaultText };
    })
    .filter((p) => p.name);

const placeholder = /\$\{([^}]+)\}/g;

const notAParameter = (owner: string, root: string, params: Parameter[]) =>
  new Error(`${owner}: "${root}" is not a parameter of this method (${params.map((p) => p.name).join(', ') || 'none'})`);

/** Index of the parameter called `name`; throws with `owner` in the message if there is none. */
export const parameterIndex = (owner: string, name: string, params: Parameter[]): number => {
  const index = params.findIndex((p) => p.name === name);
  if (index < 0) throw notAParameter(owner, name, params);
  return index;
};

/** Throws now if any `${root.path}` placeholder in `template` doesn't name a parameter. */
export const checkPlaceholders = (owner: string, template: string, params: Parameter[]): void => {
  for (const [, path] of template.matchAll(placeholder)) parameterIndex(owner, path.trim().split('.')[0], params);
};

/**
 * Fills `${param.path}` placeholders with call arguments. An omitted argument shows its default value's source text.
 * A name that isn't a parameter throws. `encode` is applied to each filled value (e.g. encodeURIComponent for URL paths).
 */
export const fill = (
  template: string,
  params: Parameter[],
  args: unknown[],
  encode: (value: string) => string = (value) => value,
  owner = `@step('${template}')`,
): string =>
  template.replace(placeholder, (_, path: string) => {
    const [root, ...keys] = path.trim().split('.');
    const index = parameterIndex(owner, root, params);
    if (args[index] === undefined && !keys.length && params[index].defaultText !== undefined) {
      return encode(params[index].defaultText!.replace(/^(['"`])(.*)\1$/, '$2'));
    }
    return encode(String(keys.reduce<any>((value, key) => value?.[key], args[index])));
  });
