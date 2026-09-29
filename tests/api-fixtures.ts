import { test as base, request, type APIRequestContext } from '@playwright/test';
import { startApiServer } from './api-server';

type WorkerFixtures = { apiBaseURL: string };
type TestFixtures = { api: APIRequestContext };

export const test = base.extend<TestFixtures, WorkerFixtures>({
  apiBaseURL: [
    async ({}, use) => {
      const server = await startApiServer();
      await use(server.baseURL);
      await server.close();
    },
    { scope: 'worker' },
  ],
  api: async ({ apiBaseURL }, use) => {
    const context = await request.newContext({ baseURL: apiBaseURL });
    await use(context);
    await context.dispose();
  },
});
export { expect } from '@playwright/test';

/** Records the step titles this test expects; checked by expected-steps-reporter. */
export const expectSteps = (...titles: string[]) =>
  titles.forEach((description) => base.info().annotations.push({ type: 'expected-step', description }));

/** Text of the test's attachment with this name (step attachments included). */
export const attachmentText = (name: string) => {
  const found = base.info().attachments.find((a) => a.name === name);
  if (!found) throw new Error(`no attachment "${name}"; have: ${base.info().attachments.map((a) => a.name).join(', ') || 'none'}`);
  return found.body!.toString();
};
