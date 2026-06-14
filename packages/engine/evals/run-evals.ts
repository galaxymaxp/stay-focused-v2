import {
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import { stage0NormalizationSuite } from "./stage0-normalization.eval.js";

const suites = [stage0NormalizationSuite];
const results = [];

for (const suite of suites) {
  const result = await runEvalSuite(suite);
  printEvalSuiteResult(result);
  results.push(result);
}

setFailureExitCode(results);
