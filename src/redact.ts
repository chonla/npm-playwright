export const MASK = '•••';

const secretHeader = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api-key|x-auth-token)$/i;
const secretKey = /pass(word|wd)?$|secret|token|api[-_]?key|authorization|cookie|credential/i;

/** Headers with secret values masked. */
export const redactHeaders = (headers: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(headers).map(([name, value]) => [name, secretHeader.test(name) ? MASK : value]));

/** A copy of a JSON value with every secret-looking key's value masked, at any depth. */
export const redactJson = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redactJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, secretKey.test(key) ? MASK : redactJson(inner)]),
    );
  }
  return value;
};
