import type { APIResponse } from '@playwright/test';
import { pathOf } from './label';

/** The Standard Schema interface (https://standardschema.dev), implemented by zod, valibot, arktype and others. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => StandardResult<Output> | Promise<StandardResult<Output>>;
    readonly types?: { readonly input: Input; readonly output: Output };
  };
}
type StandardIssue = { readonly message: string; readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> };
type StandardResult<Output> = { readonly value: Output; readonly issues?: undefined } | { readonly issues: ReadonlyArray<StandardIssue> };

export type InferOutput<S extends StandardSchemaV1> = NonNullable<S['~standard']['types']>['output'];


/**
 * Parses a response body as JSON and validates it with a Standard Schema (e.g. a zod schema).
 * Returns the typed value; throws listing every issue with its path when the body doesn't match.
 */
export async function parseBody<S extends StandardSchemaV1>(response: APIResponse, schema: S): Promise<InferOutput<S>> {
  const source = `Response ${response.status()} from ${pathOf(response.url())}`;
  const text = (await response.body()).toString('utf8');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${source} is not JSON:\n${text.slice(0, 500)}`);
  }
  const result = await schema['~standard'].validate(body);
  if (result.issues) {
    const lines = result.issues.map((issue) => {
      const path = (issue.path ?? []).map((part) => String(typeof part === 'object' ? part.key : part)).join('.');
      return `  ${path || '(root)'}: ${issue.message}`;
    });
    throw new Error(`${source} does not match the schema:\n${lines.join('\n')}`);
  }
  return result.value as InferOutput<S>;
}
