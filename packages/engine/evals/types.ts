export type EvalStatus = "passed" | "failed";

export interface EvalIssue {
  readonly message: string;
  readonly expected?: unknown;
  readonly actual?: unknown;
}

export interface EvalCase {
  readonly name: string;
  readonly run: () => Promise<readonly EvalIssue[]>;
}

export interface EvalResult {
  readonly name: string;
  readonly status: EvalStatus;
  readonly issues: readonly EvalIssue[];
}

export interface EvalSuite {
  readonly name: string;
  readonly cases: readonly EvalCase[];
}

export interface EvalSuiteResult {
  readonly name: string;
  readonly status: EvalStatus;
  readonly passed: number;
  readonly failed: number;
  readonly results: readonly EvalResult[];
}
