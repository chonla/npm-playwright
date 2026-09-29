import { test, type APIResponse } from '@playwright/test';
import { redactHeaders, redactJson } from './redact';
import { pathOf } from './label';

/** Duck-typed so it works across Playwright versions and copies. */
export const isApiResponse = (value: unknown): value is APIResponse =>
  !!value && typeof value === 'object' &&
  ['url', 'status', 'statusText', 'headers', 'body'].every((method) => typeof (value as any)[method] === 'function');

export type SentRequest = { method: string; url: string; headers?: Record<string, string>; data?: unknown; form?: unknown; params?: unknown };

type Attacher = { attach(name: string, options: { body: string; contentType: string }): Promise<void> };

const MAX_BODY = 20_000;

const pretty = (value: unknown) => JSON.stringify(redactJson(value), null, 2);

const bodyText = async (response: APIResponse) => {
  let text: string;
  try {
    text = (await response.body()).toString('utf8');
  } catch {
    return '(body unavailable)';
  }
  if (!text) return '(empty)';
  try {
    text = pretty(JSON.parse(text));
  } catch {
    /* not JSON: show as text */
  }
  return text.length > MAX_BODY ? `${text.slice(0, MAX_BODY)}\n… (${text.length - MAX_BODY} more characters)` : text;
};

const headerLines = (headers: Record<string, string>) =>
  Object.entries(redactHeaders(headers)).map(([name, value]) => `${name}: ${value}`).join('\n') || '(none)';


/**
 * Attaches a readable, redacted record of an HTTP exchange to the current step (or test, on Playwright < 1.51).
 * Named "<METHOD> <path> → <status>" when the request is known, "<path> → <status>" otherwise.
 */
export async function attachExchange(stepInfo: Attacher | undefined, response: APIResponse, request?: SentRequest) {
  const path = pathOf(request?.url ?? response.url());
  const name = `${request ? `${request.method} ` : ''}${path} → ${response.status()}`;
  const sections = [`${request?.method ?? ''} ${response.url()} → ${response.status()} ${response.statusText()}`.trim()];
  if (request) {
    if (request.headers && Object.keys(request.headers).length) sections.push(`Request headers:\n${headerLines(request.headers)}`);
    if (request.params !== undefined) sections.push(`Request query:\n${pretty(request.params)}`);
    if (request.data !== undefined) sections.push(`Request body (JSON):\n${pretty(request.data)}`);
    if (request.form !== undefined) sections.push(`Request body (form):\n${pretty(request.form)}`);
  }
  sections.push(`Response headers:\n${headerLines(response.headers())}`);
  sections.push(`Response body:\n${await bodyText(response)}`);
  const target: Attacher = stepInfo && typeof stepInfo.attach === 'function' ? stepInfo : test.info();
  await target.attach(name, { body: sections.join('\n\n'), contentType: 'text/plain' });
}
