import type {
  EvalCase,
  EvalIssue,
  EvalResult,
  EvalSuite,
  EvalSuiteResult,
} from "./types.js";

interface RuntimeProcess {
  readonly argv?: readonly string[];
  exitCode?: number;
}

export function assertEqual(
  actual: unknown,
  expected: unknown,
  message: string,
): readonly EvalIssue[] {
  return Object.is(actual, expected)
    ? []
    : [{ message, expected, actual }];
}

export function assertDeepEqual(
  actual: unknown,
  expected: unknown,
  message: string,
): readonly EvalIssue[] {
  return serialize(actual) === serialize(expected)
    ? []
    : [{ message, expected, actual }];
}

export function assertIncludes(
  actual: string,
  expectedText: string,
  message: string,
): readonly EvalIssue[] {
  return actual.includes(expectedText)
    ? []
    : [{ message, expected: expectedText, actual }];
}

export async function runEvalSuite(
  suite: EvalSuite,
): Promise<EvalSuiteResult> {
  const results = await Promise.all(suite.cases.map(runEvalCase));
  const passed = results.filter((result) => result.status === "passed").length;
  const failed = results.length - passed;

  return {
    name: suite.name,
    status: failed === 0 ? "passed" : "failed",
    passed,
    failed,
    results,
  };
}

export function printEvalSuiteResult(result: EvalSuiteResult): void {
  console.log(result.name);
  console.log(`Passed: ${result.passed}`);
  console.log(`Failed: ${result.failed}`);

  const failedResults = result.results.filter(
    (caseResult) => caseResult.status === "failed",
  );
  if (failedResults.length === 0) {
    return;
  }

  console.log("");
  console.log("Failed cases:");
  for (const failedResult of failedResults) {
    console.log("");
    console.log(`* ${failedResult.name}`);
    for (const issue of failedResult.issues) {
      console.log(`  * ${formatIssue(issue)}`);
    }
  }
}

export function setFailureExitCode(
  results: readonly EvalSuiteResult[],
): void {
  if (results.some((result) => result.status === "failed")) {
    const runtimeProcess = getRuntimeProcess();
    if (runtimeProcess) {
      runtimeProcess.exitCode = 1;
    }
  }
}

export function isDirectExecution(moduleUrl: string): boolean {
  const entryPath = getRuntimeProcess()?.argv?.[1];
  if (!entryPath) {
    return false;
  }

  const normalizedModulePath = decodeURIComponent(moduleUrl)
    .replace(/^file:\/\/\/?/i, "")
    .replaceAll("\\", "/")
    .toLowerCase();
  const normalizedEntryPath = entryPath
    .replaceAll("\\", "/")
    .toLowerCase();

  return normalizedModulePath.endsWith(normalizedEntryPath);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runEvalCase(evalCase: EvalCase): Promise<EvalResult> {
  try {
    const issues = await evalCase.run();
    return {
      name: evalCase.name,
      status: issues.length === 0 ? "passed" : "failed",
      issues,
    };
  } catch (error) {
    return {
      name: evalCase.name,
      status: "failed",
      issues: [
        {
          message: `Unexpected error: ${errorMessage(error)}`,
        },
      ],
    };
  }
}

function formatIssue(issue: EvalIssue): string {
  if (!("expected" in issue) && !("actual" in issue)) {
    return issue.message;
  }

  return `${issue.message} Expected ${formatValue(issue.expected)} but received ${formatValue(issue.actual)}.`;
}

function formatValue(value: unknown): string {
  const serialized = serialize(value);
  return serialized === undefined ? String(value) : serialized;
}

function serialize(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      return Object.fromEntries(
        Object.entries(entry as Readonly<Record<string, unknown>>).sort(
          ([leftKey], [rightKey]) => leftKey.localeCompare(rightKey),
        ),
      );
    }
    return entry;
  });
}

function getRuntimeProcess(): RuntimeProcess | undefined {
  const runtime = globalThis as typeof globalThis & {
    readonly process?: RuntimeProcess;
  };
  return runtime.process;
}
