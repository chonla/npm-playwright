import type { FullResult, Reporter, TestCase, TestResult, TestStep } from '@playwright/test/reporter';

/** Fails the run if a test's `expected-step` annotations don't appear, in order, among its test.step titles. */
export default class ExpectedStepsReporter implements Reporter {
  private failures: string[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    const expected = test.annotations.filter((a) => a.type === 'expected-step').map((a) => a.description!);
    if (!expected.length) return;
    const actual: string[] = [];
    const walk = (steps: TestStep[]) => steps.forEach((s) => { if (s.category === 'test.step') actual.push(s.title); walk(s.steps); });
    walk(result.steps);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      this.failures.push(`${test.title}\n  expected steps: ${JSON.stringify(expected)}\n  actual steps:   ${JSON.stringify(actual)}`);
    }
  }

  async onEnd(): Promise<{ status?: FullResult["status"] } | void> {
    if (!this.failures.length) return;
    console.error(`\nStep title mismatches:\n${this.failures.join('\n')}`);
    return { status: 'failed' };
  }
}
