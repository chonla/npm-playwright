import { test, expect, type Page } from '@playwright/test';
import { step } from '../dist';

const expectSteps = (...titles: string[]) =>
  titles.forEach((description) => test.info().annotations.push({ type: 'expected-step', description }));

type Credential = { username: string; password: string };

class LoginPage {
  constructor(readonly page: Page) {}
  calls: string[] = [];

  @step()
  async open() { this.calls.push('open'); }

  @step('Login With ${credential.username}')
  async loginWith(credential: Credential) { this.calls.push(`login ${credential.username}`); return 'done'; }

  @step('Add ${name} x${quantity}')
  async add(name: string, quantity = 1) { this.calls.push(`add ${name} ${quantity}`); }

  @step('Typo ${credentail.username}')
  async typo(credential: Credential) {}

  @step()
  async fail() { throw new Error('boom'); }
}

const page = {} as Page;

test('untitled step reads "<Class Name> › <Method Name>"', async () => {
  expectSteps('Login Page › Open');
  await new LoginPage(page).open();
});

test('title placeholders are filled from the arguments, and the method still runs and returns', async () => {
  expectSteps('Login Page › Login With alice');
  const login = new LoginPage(page);
  expect(await login.loginWith({ username: 'alice', password: 'secret' })).toBe('done');
  expect(login.calls).toEqual(['login alice']);
});

test('parameters with default values can be used in titles', async () => {
  expectSteps('Login Page › Add Hoodie x3', 'Login Page › Add Cap x1');
  const login = new LoginPage(page);
  await login.add('Hoodie', 3);
  await login.add('Cap');
});

test('a placeholder that is not a parameter rejects with a clear message', async () => {
  await expect(new LoginPage(page).typo({ username: 'a', password: 'b' })).rejects.toThrow(
    /"credentail" is not a parameter of this method \(credential\)/,
  );
});

test('errors thrown by the method propagate', async () => {
  await expect(new LoginPage(page).fail()).rejects.toThrow('boom');
});

class ShopPage {
  constructor(readonly page: Page) {}
  @step('Search ${term} In ${category}')
  async search(term: string, category = 'All') {}
}

test('an omitted string default shows without quotes', async () => {
  expectSteps('Shop Page › Search hoodie In All');
  await new ShopPage(page).search('hoodie');
});
