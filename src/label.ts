/** "loginWith" → "Login With", "LoginPage" → "Login Page" */
export const words = (name: string): string =>
  name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

export type Parameter = { name: string; defaultText?: string };

/**
 * Parameters of a function, read from its source:
 * `add(name, quantity = 1)` → [{ name: 'name' }, { name: 'quantity', defaultText: '1' }].
 * Destructured parameters and defaults containing parentheses or commas are not supported.
 */
export const parameters = (fn: Function): Parameter[] =>
  (fn.toString().match(/\(([^)]*)\)/)?.[1] ?? '')
    .split(',')
    .map((raw) => {
      const [name, defaultText] = raw.replace(/^\s*\.\.\./, '').split('=').map((part) => part.trim());
      return { name, defaultText };
    })
    .filter((p) => p.name);

/**
 * Fills `${param.path}` placeholders with call arguments. An omitted argument shows its default value's source text.
 * A name that isn't a parameter throws.
 */
export const fill = (template: string, params: Parameter[], args: unknown[]): string =>
  template.replace(/\$\{([^}]+)\}/g, (_, path: string) => {
    const [root, ...keys] = path.trim().split('.');
    const index = params.findIndex((p) => p.name === root);
    if (index < 0) {
      const names = params.map((p) => p.name).join(', ') || 'none';
      throw new Error(`@step('${template}'): "${root}" is not a parameter of this method (${names})`);
    }
    if (args[index] === undefined && !keys.length && params[index].defaultText !== undefined) {
      return params[index].defaultText!.replace(/^(['"`])(.*)\1$/, '$2');
    }
    return String(keys.reduce<any>((value, key) => value?.[key], args[index]));
  });
