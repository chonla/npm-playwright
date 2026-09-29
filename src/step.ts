import { test } from '@playwright/test';
import { fill, parameters, words } from './label';

/**
 * Method decorator that wraps a page-object action in `test.step`, so reports read as business steps:
 * `In Login Page, Login With`.
 *
 * An optional title replaces the action part and may reference parameters:
 * `@step('Login With ${credential.username}')` → `In Login Page, Login With alice`.
 * Use a plain quoted string, not backticks — placeholders are filled when the method is called.
 * Never reference secrets (passwords, tokens) in a title: reports and traces get shared.
 */
export function step(title?: string) {
  return function <This extends object, Args extends unknown[], R>(
    target: (this: This, ...args: Args) => Promise<R>,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<R>>,
  ) {
    const params = parameters(target);
    return async function (this: This, ...args: Args): Promise<R> {
      const action = title ? fill(title, params, args) : words(String(context.name));
      return test.step(`In ${words(this.constructor.name)}, ${action}`, () => target.call(this, ...args), { box: true });
    };
  };
}
