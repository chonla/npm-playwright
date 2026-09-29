import { test } from '@playwright/test';
import { attachExchange, isApiResponse } from './exchange';
import { fill, keepParameters, parameters, words } from './label';

/**
 * Method decorator that wraps a page-object or API-client method in `test.step`, so reports read as business steps:
 * `Login Page › Login With`.
 *
 * An optional title replaces the action part and may reference parameters:
 * `@step('Login With ${credential.username}')` → `Login Page › Login With alice`.
 * Use a plain quoted string, not backticks — placeholders are filled when the method is called.
 * Never reference secrets (passwords, tokens) in a title: reports and traces get shared.
 *
 * When the method returns a Playwright `APIResponse`, the response (status, headers, body — secrets redacted)
 * is attached to the step.
 */
export function step(title?: string) {
  return function <This extends object, Args extends unknown[], R>(
    target: (this: This, ...args: Args) => Promise<R>,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<R>>,
  ) {
    const params = parameters(target);
    return keepParameters(async function (this: This, ...args: Args): Promise<R> {
      const action = title ? fill(title, params, args) : words(String(context.name));
      return test.step(
        `${words(this.constructor.name)} › ${action}`,
        async (stepInfo?: any) => {
          const result = await target.call(this, ...args);
          if (isApiResponse(result) && !(result as any)[ATTACHED]) await attachExchange(stepInfo, result);
          return result;
        },
        { box: true },
      );
    }, params);
  };
}

/** Set on responses whose exchange an endpoint decorator already attached, so an outer @step doesn't repeat it. */
export const ATTACHED = Symbol.for('@chonla/playwright:attached');
