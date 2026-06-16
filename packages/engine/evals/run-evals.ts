import {
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import { stage0NormalizationSuite } from "./stage0-normalization.eval.js";
import { stage1OutlineSuite } from "./stage1-outline.eval.js";
import { stage2PlanSuite } from "./stage2-plan.eval.js";
import { stage3GenerateSuite } from "./stage3-generate.eval.js";
import { stage4VerifySuite } from "./stage4-verify.eval.js";
import { stage5aGroundingSuite } from "./stage5a-grounding.eval.js";
import { stage5RetrySuite } from "./stage5-retry.eval.js";
import { stage6AssembleSuite } from "./stage6-assemble.eval.js";
import { pipelineSuite } from "./pipeline.eval.js";

const suites = [
  stage0NormalizationSuite,
  stage1OutlineSuite,
  stage2PlanSuite,
  stage3GenerateSuite,
  stage4VerifySuite,
  stage5aGroundingSuite,
  stage5RetrySuite,
  stage6AssembleSuite,
  pipelineSuite,
];
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
