import {
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import { stage0NormalizationSuite } from "./stage0-normalization.eval.js";
import { stage1OutlineSuite } from "./stage1-outline.eval.js";

const suites = [stage0NormalizationSuite, stage1OutlineSuite];
const results = [];

for (const [index, suite] of suites.entries()) {
  if (index > 0) {
    console.log("");
  }
  const result = await runEvalSuite(suite);
  printEvalSuiteResult(result);
  results.push(result);
}

const totalPassed = results.reduce((total, result) => total + result.passed, 0);
const totalFailed = results.reduce((total, result) => total + result.failed, 0);

console.log("");
console.log("Total");
console.log(`Passed: ${totalPassed}`);
console.log(`Failed: ${totalFailed}`);

setFailureExitCode(results);
