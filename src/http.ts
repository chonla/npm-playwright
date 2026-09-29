import { test, type APIRequestContext, type APIResponse } from '@playwright/test';
import { attachExchange, type SentRequest } from './exchange';
import { checkPlaceholders, fill, keepParameters, parameterIndex, parameters, words } from './label';
import { ATTACHED } from './step';

export type EndpointOptions = {
  /** Name of the parameter sent as the JSON body. */
  data?: string;
  /** Name of the parameter sent as a form-encoded body. */
  form?: string;
  /** Name of the parameter sent as the query string. */
  params?: string;
  /** Request headers; values may use `${param.path}` placeholders. */
  headers?: Record<string, string>;
};

type ApiClient = { readonly request: APIRequestContext };

/** `{ page: 2, q: 'a b' }` → "page=2&q=a%20b" (display only; Playwright builds the real query). */
const queryString = (query: Record<string, unknown>) =>
  Object.entries(query).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&');

function endpoint(method: string, path: string, options: EndpointOptions = {}) {
  const owner = `@${method[0]}${method.slice(1).toLowerCase()}('${path}')`;
  return function <This extends ApiClient, Args extends unknown[]>(
    target: (this: This, ...args: Args) => Promise<APIResponse>,
    _context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<APIResponse>>,
  ) {
    const params = parameters(target);
    // Fail when the class is defined, not on first call: typos in names surface immediately.
    checkPlaceholders(owner, path, params);
    for (const value of Object.values(options.headers ?? {})) checkPlaceholders(owner, value, params);
    const dataIndex = options.data === undefined ? undefined : parameterIndex(owner, options.data, params);
    const formIndex = options.form === undefined ? undefined : parameterIndex(owner, options.form, params);
    const paramsIndex = options.params === undefined ? undefined : parameterIndex(owner, options.params, params);

    return keepParameters(async function (this: This, ...args: Args): Promise<APIResponse> {
      const url = fill(path, params, args, encodeURIComponent, owner);
      const headers = options.headers
        ? Object.fromEntries(Object.entries(options.headers).map(([name, value]) => [name, fill(value, params, args, (v) => v, owner)]))
        : undefined;
      const query = paramsIndex === undefined ? undefined : args[paramsIndex];
      const shown = query && typeof query === 'object' ? `${url}${url.includes('?') ? '&' : '?'}${queryString(query as Record<string, unknown>)}` : url;
      const sent: SentRequest = {
        method,
        url: shown,
        headers,
        data: dataIndex === undefined ? undefined : args[dataIndex],
        form: formIndex === undefined ? undefined : args[formIndex],
        params: query,
      };
      return test.step(
        `${words(this.constructor.name)} › ${method} ${shown}`,
        async (stepInfo?: any) => {
          const response = await this.request.fetch(url, {
            method,
            headers,
            data: sent.data,
            form: sent.form as any,
            params: sent.params as any,
          });
          await attachExchange(stepInfo, response, sent);
          Object.defineProperty(response, ATTACHED, { value: true });
          return response;
        },
        { box: true },
      );
    }, params);
  };
}

/** Declares a GET request: `@Get('/api/products/${sku}') bySku(sku: string): Promise<APIResponse> { return declared(); }` */
export const Get = (path: string, options?: EndpointOptions) => endpoint('GET', path, options);
/** Declares a POST request: `@Post('/api/auth', { data: 'credential' })`. */
export const Post = (path: string, options?: EndpointOptions) => endpoint('POST', path, options);
/** Declares a PUT request. */
export const Put = (path: string, options?: EndpointOptions) => endpoint('PUT', path, options);
/** Declares a PATCH request. */
export const Patch = (path: string, options?: EndpointOptions) => endpoint('PATCH', path, options);
/** Declares a DELETE request. */
export const Delete = (path: string, options?: EndpointOptions) => endpoint('DELETE', path, options);
/** Declares a HEAD request. */
export const Head = (path: string, options?: EndpointOptions) => endpoint('HEAD', path, options);

/**
 * Body for methods whose request is made by an endpoint decorator. Throws if the decorator is missing,
 * instead of silently returning undefined.
 */
export function declared(): never {
  throw new Error('This method has no @Get/@Post/@Put/@Patch/@Delete/@Head decorator, so there is no request to make.');
}
