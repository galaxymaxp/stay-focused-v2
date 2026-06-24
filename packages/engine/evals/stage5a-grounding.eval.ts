import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { normalizeSource } from "../src/stage0-normalize.js";
import { detectOutline, flattenSourceBlocks } from "../src/stage1-outline.js";
import { extractCleanSourceItems } from "../src/source-items.js";
import { validateGrounding } from "../src/stage5a-grounding.js";
import type {
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  SectionGroundingResult,
  SectionOutput,
  SourceOutline,
  SourceOutlineSection,
} from "../src/types.js";
import {
  assertDeepEqual,
  assertEqual,
  isDirectExecution,
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import type { EvalCase, EvalIssue, EvalSuite } from "./types.js";

export const stage5aGroundingSuite: EvalSuite = {
  name: "Stage 5a grounding validation",
  cases: [
    createRepeatedHeadingSuffixCleanupCase(),
    createInlineBulletGlyphExtractionCase(),
    createLineAndNumberedBulletExtractionCase(),
    createFixtureDStyleNestedBulletExtractionCase(),
    createFlattenedOcrHyphenStreamExtractionCase(),
    createTableRowExtractionCase(),
    createCleanedFusedItemGroundingCase(),
    createLooseConnectivePhase1Case(),
    createInventedEndpointDescriptionCase(),
    createVerbatimListAdherenceCase(),
    createReplacementProseOmissionCase(),
    createCompleteDomainsListCase(),
    createMalwareOmissionThresholdCase(),
    createImpactReductionDriftCase(),
    createDomainDescriptionInCoreCase(),
    createPureStopwordParaphraseCase(),
    createSymptomsRegressionCase(),
    createSparseIntroductionRegressionCase(),
    createBlendedAttackRegressionCase(),
    createDenyServiceRegressionCase(),
    createFaithfulSectionsCase(),
  ],
};

function createInlineBulletGlyphExtractionCase(): EvalCase {
  return {
    name: "inline bullet glyphs extract source items",
    run: async () =>
      assertDeepEqual(
        sourceItemTexts(
          "Table of Contents \u2022 Arduino Simulator \u2022 Programming in Arduino \u2013 Basics \u2022 Arduino Parts",
          "Table of Contents",
        ),
        [
          "Arduino Simulator",
          "Programming in Arduino \u2013 Basics",
          "Arduino Parts",
        ],
        "Inline bullet glyph source items were not extracted in order.",
      ),
  };
}

function createLineAndNumberedBulletExtractionCase(): EvalCase {
  return {
    name: "line-start bullets and numbered bullets extract together",
    run: async () =>
      assertDeepEqual(
        sourceItemTexts(
          [
            "Basic Protection Methods",
            "- Strong passwords help prevent unauthorized access.",
            "- Updates fix known software weaknesses.",
            "1. Backups help recover data after loss or damage.",
          ].join("\n"),
          "Basic Protection Methods",
        ),
        [
          "Strong passwords help prevent unauthorized access.",
          "Updates fix known software weaknesses.",
          "Backups help recover data after loss or damage.",
        ],
        "Mixed bullet and numbered source items were not extracted.",
      ),
  };
}

function createFixtureDStyleNestedBulletExtractionCase(): EvalCase {
  return {
    name: "Fixture D-style nested lecture bullets are represented",
    run: async () => {
      const items = sourceItemTexts(
        [
          "Module 3: Basic Cybersecurity Concepts",
          "",
          "1. Security Goals",
          "Cybersecurity protects systems, networks, and data from unauthorized access and damage.",
          "- Confidentiality means only authorized users can access information.",
          "- Integrity means information stays accurate and unchanged unless properly modified.",
          "- Availability means systems and data are accessible when needed.",
          "",
          "2. Common Threats",
          "Threats are possible causes of harm to systems or data.",
          "- Malware is harmful software.",
          "- Phishing tricks users into giving sensitive information.",
          "- Denial of service attacks try to make a service unavailable.",
        ].join("\n"),
        "Basic Cybersecurity Concepts",
      );

      return [
        ...assertEqual(
          items.some((item) => item.includes("Confidentiality means")),
          true,
          "Fixture D confidentiality bullet was not represented.",
        ),
        ...assertEqual(
          items.some((item) => item.includes("Integrity means")),
          true,
          "Fixture D integrity bullet was not represented.",
        ),
        ...assertEqual(
          items.some((item) => item.includes("Availability means")),
          true,
          "Fixture D availability bullet was not represented.",
        ),
        ...assertEqual(
          items.some((item) => item.includes("Malware is harmful software")),
          true,
          "Fixture D malware bullet was not represented.",
        ),
        ...assertEqual(
          items.some((item) => item.includes("Phishing tricks users")),
          true,
          "Fixture D phishing bullet was not represented.",
        ),
        ...assertEqual(
          items.some((item) =>
            item.includes("Denial of service attacks try"),
          ),
          true,
          "Fixture D denial-of-service bullet was not represented.",
        ),
      ];
    },
  };
}

function createFlattenedOcrHyphenStreamExtractionCase(): EvalCase {
  return {
    name: "Fixture B-style flattened OCR hyphen stream extracts clear list items",
    run: async () => {
      const items = sourceItemTexts(
        [
          "Arduino Basics Unit 2 CIT4 Introduction to Integrative Programming",
          "Table of Contents - Arduino Simulator - Programming in Arduino - Basics",
          "- Arduino Parts - Digital inputs and outputs - LED - Resistors",
          "- Breadboard - Series Circuits - Parallel Circuits",
          "Arduino Simulator TinkerCad Arduino Simulator - TinkerCad",
          "- Go to https://www.tinkercad.com/dashboard",
          "- It is a web-based open-source simulator",
          "- Contains Arduino modelling with code",
          "- Create a personal account (not student account)",
          "- In the dashboard, select circuits.",
        ].join(" "),
        "Arduino Basics",
      );
      const isolatedHyphenPhrase = sourceItemTexts(
        "TinkerCad Arduino Simulator - TinkerCad",
        "Arduino Simulator",
      );

      return [
        ...assertEqual(
          items.includes("Arduino Simulator"),
          true,
          "Fixture B TOC item Arduino Simulator was not detected.",
        ),
        ...assertEqual(
          items.includes("Programming in Arduino - Basics"),
          true,
          "Fixture B TOC item Programming in Arduino - Basics was not preserved.",
        ),
        ...assertEqual(
          items.includes("Arduino Parts"),
          true,
          "Fixture B TOC item Arduino Parts was not detected.",
        ),
        ...assertEqual(
          items.includes("Go to https://www.tinkercad.com/dashboard"),
          true,
          "Fixture B TinkerCad URL fact was not detected.",
        ),
        ...assertEqual(
          items.includes("It is a web-based open-source simulator"),
          true,
          "Fixture B TinkerCad simulator fact was not detected.",
        ),
        ...assertEqual(
          items.includes("Basics"),
          false,
          "Fixture B split a subtitle into a standalone meaningless fragment.",
        ),
        ...assertEqual(
          isolatedHyphenPhrase.length,
          0,
          "A single inline hyphen phrase was incorrectly treated as a list.",
        ),
        ...assertEqual(
          items.length > 1,
          true,
          "Fixture B flattened OCR extraction returned only one giant item.",
        ),
      ];
    },
  };
}

function createTableRowExtractionCase(): EvalCase {
  return {
    name: "table-like rows extract term and meaning source items",
    run: async () =>
      assertDeepEqual(
        sourceItemTexts(
          [
            "| Term | Meaning |",
            "| Confidentiality | Only authorized users can access information |",
            "| Integrity | Information stays accurate and unchanged |",
            "| Availability | Systems and data are accessible when needed |",
          ].join("\n"),
          "Security Goals",
        ),
        [
          "Confidentiality | Only authorized users can access information",
          "Integrity | Information stays accurate and unchanged",
          "Availability | Systems and data are accessible when needed",
        ],
        "Table rows did not preserve term/meaning source items.",
      ),
  };
}

function createRepeatedHeadingSuffixCleanupCase(): EvalCase {
  return {
    name: "source item cleanup removes repeated heading suffixes",
    run: async () => [
      ...assertDeepEqual(
        extractCleanSourceItems({
          sourceSpanText:
            "Types of Malware • Spyware • Scareware Types of Malware",
          sectionTitle: "Types of Malware",
        }).map((item) => item.text),
        ["Spyware", "Scareware"],
        "Malware heading suffix was not removed from the final item.",
      ),
      ...assertDeepEqual(
        extractCleanSourceItems({
          sourceSpanText:
            "Symptoms of Malware • Browser redirection • Files are deleted Symptoms of Malware",
          sectionTitle: "Symptoms of Malware",
        }).map((item) => item.text),
        ["Browser redirection", "Files are deleted"],
        "Symptoms heading suffix was not removed from the final item.",
      ),
      ...assertDeepEqual(
        extractCleanSourceItems({
          sourceSpanText:
            "Methods to Deny Service • Zombie – Infected Host • Botnet – Network of Infected Hosts Methods to Deny Service",
          sectionTitle: "Methods to Deny Service",
        }).map((item) => item.text),
        [
          "Zombie – Infected Host",
          "Botnet – Network of Infected Hosts",
        ],
        "Service-denial heading suffix was not removed from the final item.",
      ),
      ...assertDeepEqual(
        extractCleanSourceItems({
          sourceSpanText:
            "Importance of cybersecurity • Critical services can be disrupted Importance of cybersecurity Importance of cybersecurity • Rising costs",
          sectionTitle: "Importance of cybersecurity",
        }).map((item) => item.text),
        ["Critical services can be disrupted", "Rising costs"],
        "Multiple repeated heading suffixes were not removed.",
      ),
    ],
  };
}

function createCleanedFusedItemGroundingCase(): EvalCase {
  return {
    name: "cleaned fused list item passes grounding with empty explanation",
    run: async () => {
      const sourceText =
        "Types of Malware • Spyware • Scareware Types of Malware";
      const context = createSyntheticContext("Types of Malware", sourceText);
      const output = createOutput(
        context.section,
        "",
        ["Spyware", "Scareware"],
      );
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const result = report.sections[0];

      return [
        ...assertEqual(
          result?.status,
          "passed",
          "Cleaned fused list item did not pass grounding.",
        ),
        ...assertEqual(
          result?.sourceItemCount,
          2,
          "Cleaned fused list item count was incorrect.",
        ),
        ...assertEqual(
          result?.representedSourceItemCount,
          2,
          "Cleaned fused list item was not represented.",
        ),
        ...assertEqual(
          result?.issues.some(
            (issue) => issue.type === "grounding-fabrication",
          ),
          false,
          "Empty explanation was incorrectly treated as fabrication.",
        ),
      ];
    },
  };
}

function createVerbatimListAdherenceCase(): EvalCase {
  return {
    name: "Verbatim list keyPoints are grounded with no omission",
    run: async () => {
      const items = [
        "Communicate the Issue",
        "Be sincere and accountable",
        "Provide details",
        "Understand the cause",
        "Take steps to avoid another breach",
        "Ensure all systems are clean",
        "Educate employees, partners, and customers",
      ];
      const sourceText = bulletListSource("Impact Reduction", items);
      const context = createSyntheticContext("Impact Reduction", sourceText);
      const output = createOutput(
        context.section,
        "Impact Reduction",
        items,
      );
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const result = report.sections[0];

      return [
        ...assertEqual(
          result?.status,
          "passed",
          "Verbatim source list did not pass grounding.",
        ),
        ...assertEqual(
          result?.issues.some(
            (issue) => issue.type === "grounding-omission",
          ),
          false,
          "Verbatim source list raised a grounding omission.",
        ),
      ];
    },
  };
}

function createReplacementProseOmissionCase(): EvalCase {
  return {
    name: "Replacement prose falls below the list coverage threshold",
    run: async () => {
      const items = [
        "Overwhelm quantity of traffic",
        "Maliciously formatted packets",
        "Zombie - Infected Host",
        "Botnet",
        "Distributed attack",
      ];
      const sourceText = bulletListSource("Methods to Deny Service", items);
      const context = createSyntheticContext(
        "Methods to Deny Service",
        sourceText,
      );
      const output = createOutput(
        context.section,
        "Methods to Deny Service",
        ["DDoS attacks flood targets with traffic"],
      );
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const result = report.sections[0];
      const listCoverage =
        result === undefined || result.sourceItemCount === 0
          ? 0
          : result.representedSourceItemCount / result.sourceItemCount;

      return [
        ...assertEqual(
          listCoverage < 0.8,
          true,
          "Replacement prose did not fall below LIST_COVERAGE_THRESHOLD.",
        ),
        ...assertEqual(
          result?.issues.some(
            (issue) => issue.type === "grounding-omission",
          ),
          true,
          "Replacement prose did not raise grounding-omission.",
        ),
      ];
    },
  };
}

export async function runStage5aGroundingEvals(): Promise<boolean> {
  const result = await runEvalSuite(stage5aGroundingSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runStage5aGroundingEvals();
}

function createLooseConnectivePhase1Case(): EvalCase {
  return {
    name: "Phase 1 rejects a faithful loose-connective paraphrase",
    run: async () => {
      const sourceText =
        "A set of cyber security strategies that prevent unauthorized access";
      const context = createSyntheticContext("IT Security", sourceText);
      const claim =
        "IT Security involves cyber security strategies that prevent unauthorized access";
      const output = createOutput(context.section, sourceText, [claim]);
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const result = report.sections[0];
      const issue = result?.issues.find(
        (candidate) => candidate.type === "grounding-fabrication",
      );

      // This flips to PASS in Phase 2 with the entailment judge. Phase 1 fixes
      // it by making the generator emit source wording, not by loosening validation.
      return [
        ...assertEqual(
          result?.status,
          "failed",
          "Loose-connective Phase 1 paraphrase did not fail.",
        ),
        ...assertDeepEqual(
          issue?.offendingText,
          ["involves"],
          "Loose-connective Phase 1 failure did not isolate the unsupported content token.",
        ),
        ...assertEqual(
          report.phase1FabricationFails,
          1,
          "Phase 1 fabrication instrumentation did not collect the failed claim.",
        ),
      ];
    },
  };
}

function createInventedEndpointDescriptionCase(): EvalCase {
  return {
    name: "Endpoint Security rejects an invented device description",
    run: async () => {
      const sourceText = "Endpoint Security";
      const context = createSyntheticContext("Endpoint Security", sourceText);
      const output = createOutput(context.section, sourceText, [
        "Endpoint Security secures end-user devices like computers and mobile phones",
      ]);
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });

      return assertEqual(
        hasUnsupportedToken(report.sections[0], /end-user/i),
        true,
        "Invented Endpoint Security description did not flag end-user.",
      );
    },
  };
}

function createCompleteDomainsListCase(): EvalCase {
  return {
    name: "Complete Domains of IT Security list passes omission coverage",
    run: async () => {
      const items = [
        "Network Security",
        "Internet Security",
        "Endpoint Security",
        "Cloud Security",
        "Application Security",
        "Information Security",
        "Operational Security",
        "Mobile Security",
        "IoT Security",
        "User Education",
        "Cyber Security",
      ];
      const sourceText = numberedListSource("Domains of IT Security", items);
      const context = createSyntheticContext(
        "Domains of IT Security",
        sourceText,
      );
      const output = createOutput(
        context.section,
        "Domains of IT Security",
        items,
      );
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const result = report.sections[0];

      return [
        ...assertEqual(
          result?.status,
          "passed",
          "Complete domains list did not pass grounding.",
        ),
        ...assertEqual(
          result?.issues.some(
            (issue) => issue.type === "grounding-omission",
          ),
          false,
          "Complete domains list raised an omission.",
        ),
      ];
    },
  };
}

function createMalwareOmissionThresholdCase(): EvalCase {
  return {
    name: "One of ten malware types fails the list coverage threshold",
    run: async () => {
      const items = [
        "Virus",
        "Worm",
        "Trojan Horse",
        "Ransomware",
        "Spyware",
        "Adware",
        "Rootkit",
        "Keylogger",
        "Bot",
        "Logic Bomb",
      ];
      const sourceText = numberedListSource("Types of Malware", items);
      const context = createSyntheticContext("Types of Malware", sourceText);
      const output = createOutput(context.section, "Types of Malware", [
        items[0] ?? "Virus",
      ]);
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });

      return assertEqual(
        report.sections[0]?.issues.some(
          (issue) => issue.type === "grounding-omission",
        ),
        true,
        "One of ten malware types did not raise grounding-omission.",
      );
    },
  };
}

function createImpactReductionDriftCase(): EvalCase {
  return {
    name: "Impact Reduction generic drift fails fabrication and omission",
    run: async () => {
      const actions = [
        "Communicate the Issue",
        "Be sincere and accountable",
        "Provide details",
        "Understand the cause of the breach",
        "Take steps to avoid another similar breach in the future",
        "Ensure all systems are clean",
        "Educate employees, partners, and customers",
      ];
      const sourceText = bulletListSource("Impact Reduction", actions);
      const context = createSyntheticContext("Impact Reduction", sourceText);
      const output = createOutput(
        context.section,
        "Impact Reduction focuses on decreasing the extent of adverse effects",
        ["Impact Reduction"],
      );
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const issueTypes =
        report.sections[0]?.issues.map((issue) => issue.type) ?? [];

      return [
        ...assertEqual(
          issueTypes.includes("grounding-fabrication"),
          true,
          "Impact Reduction generic drift did not raise fabrication.",
        ),
        ...assertEqual(
          issueTypes.includes("grounding-omission"),
          true,
          "Impact Reduction generic drift did not raise omission.",
        ),
      ];
    },
  };
}

function createDomainDescriptionInCoreCase(): EvalCase {
  return {
    name: "Domain-name-only source rejects descriptions in sourceCore",
    run: async () => {
      const items = [
        "Network Security",
        "Internet Security",
        "Endpoint Security",
      ];
      const sourceText = numberedListSource("Domains of IT Security", items);
      const context = createSyntheticContext(
        "Domains of IT Security",
        sourceText,
      );
      const output = createOutput(
        context.section,
        "Domains of IT Security",
        [
          "Endpoint Security: enhances security by securing end-user devices like computers and mobile phones",
        ],
      );
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });

      return assertEqual(
        hasUnsupportedToken(report.sections[0], /end-user/i),
        true,
        "Description added to a domain name did not raise fabrication.",
      );
    },
  };
}

function createPureStopwordParaphraseCase(): EvalCase {
  return {
    name: "Pure stopword additions remain grounded",
    run: async () => {
      const sourceText =
        "Network Security Internet Security Endpoint Security";
      const context = createSyntheticContext("Security Domains", sourceText);
      const claim =
        "Network Security and Internet Security and Endpoint Security";
      const output = createOutput(context.section, sourceText, [claim]);
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });

      return assertEqual(
        report.sections[0]?.status,
        "passed",
        "Pure stopword additions did not pass grounding.",
      );
    },
  };
}

function createSymptomsRegressionCase(): EvalCase {
  return {
    name: "IT Security Symptoms of Malware flags omission and fabrication",
    run: async () => {
      const context = await createItSecurityContext("Symptoms of Malware");
      const output = createOutput(
        context.section,
        "Malware symptoms include browser hijackers, network telemetry changes, high CPU usage, and deleted files.",
        [
          "Browser hijackers can appear during malware infections.",
          "Network telemetry changes can reveal malware.",
        ],
      );
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const result = report.sections[0];
      const issueTypes = result?.issues.map((issue) => issue.type) ?? [];

      return [
        ...assertEqual(
          issueTypes.includes("grounding-omission"),
          true,
          "Symptoms of Malware did not raise grounding-omission.",
        ),
        ...assertEqual(
          issueTypes.includes("grounding-fabrication"),
          true,
          "Symptoms of Malware did not raise grounding-fabrication.",
        ),
      ];
    },
  };
}

function createBlendedAttackRegressionCase(): EvalCase {
  return {
    name: "IT Security Blended Attacks flags retail SQL scenario fabrication",
    run: async () => {
      const context = await createItSecurityContext("Blended Attacks");
      const output = createOutput(
        context.section,
        "A retail company receives phishing emails and then suffers SQL injection through its checkout system.",
        ["The retail SQL-injection scenario shows how blended attacks escalate."],
      );
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const result = report.sections[0];

      return assertEqual(
        result?.issues.some(
          (issue) =>
            issue.type === "grounding-fabrication" &&
            issue.offendingText?.some((token) =>
              /sql|retail|injection/i.test(token),
            ),
        ),
        true,
        "Blended Attacks retail SQL scenario did not raise fabrication.",
      );
    },
  };
}

function createSparseIntroductionRegressionCase(): EvalCase {
  return {
    name: "IT Security sparse Introduction rejects generic expansion",
    run: async () => {
      const context = await createItSecurityContext("Introduction");
      const sourceText = extractSourceSectionText(
        context.source,
        context.sourceSection,
      );
      const expandedOutput = createOutput(
        context.section,
        "The Introduction to IT Security serves as the foundational entry point into information technology security and explains how organizations protect data and systems from threats.",
        [
          "IT Security Overview: safeguards information technology systems from unauthorized access and threats.",
          "Risk Assessment: identifies and evaluates potential risks to IT systems.",
          "Security Layers: uses multi-layered strategies to protect systems.",
        ],
      );
      const expandedReport = validateGrounding({
        plan: context.plan,
        outputs: [expandedOutput],
        source: context.source,
        outline: context.outline,
      });
      const expandedResult = expandedReport.sections[0];
      const minimalOutput = createOutput(context.section, sourceText, [sourceText]);
      const minimalReport = validateGrounding({
        plan: context.plan,
        outputs: [minimalOutput],
        source: context.source,
        outline: context.outline,
      });
      const minimalResult = minimalReport.sections[0];

      return [
        ...assertEqual(
          sourceText,
          "Intro to IT Security Module 1",
          "Introduction source span did not match the exact sparse live span.",
        ),
        ...assertEqual(
          expandedResult?.status,
          "failed",
          "Sparse Introduction generic expansion did not fail grounding.",
        ),
        ...assertEqual(
          expandedResult?.issues.some(
            (issue) => issue.type === "grounding-fabrication",
          ),
          true,
          "Sparse Introduction expansion did not raise fabrication.",
        ),
        ...assertEqual(
          minimalResult?.status,
          "passed",
          "Minimal sparse Introduction sourceCore did not pass grounding.",
        ),
      ];
    },
  };
}

function createDenyServiceRegressionCase(): EvalCase {
  return {
    name: "IT Security Methods to Deny Service flags unsupported flood specifics",
    run: async () => {
      const context = await createItSecurityContext("Methods to Deny Service");
      const output = createOutput(
        context.section,
        "Denial methods include ICMP flood, SYN flood, UDP flood, HTTP flood, and Slowloris.",
        ["ICMP, SYN, UDP, HTTP, and Slowloris are specific service-denial methods."],
      );
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const result = report.sections[0];

      return assertEqual(
        result?.issues.some(
          (issue) =>
            issue.type === "grounding-fabrication" &&
            issue.offendingText?.some((token) =>
              /icmp|syn|udp|slowloris|http/i.test(token),
            ),
        ),
        true,
        "Methods to Deny Service unsupported flood specifics did not raise fabrication.",
      );
    },
  };
}

function createFaithfulSectionsCase(): EvalCase {
  return {
    name: "Faithful extraction passes grounding cleanly",
    run: async () => {
      const sourceText =
        "Cybersecurity protects networked systems and data from unauthorized use or harm";
      const context = createSyntheticContext("Cybersecurity", sourceText);
      const output = createOutput(
        context.section,
        sourceText,
        [sourceText],
      );
      const report = validateGrounding({
        plan: context.plan,
        outputs: [output],
        source: context.source,
        outline: context.outline,
      });
      const issues: EvalIssue[] = [];

      for (const result of report.sections) {
        issues.push(
          ...assertEqual(
            result.status,
            "passed",
            `Faithful section ${result.plannedSectionId} did not pass grounding.`,
          ),
          ...assertEqual(
            result.issues.length,
            0,
            `Faithful section ${result.plannedSectionId} emitted grounding issues.`,
          ),
        );
      }

      return issues;
    },
  };
}

function createSyntheticContext(
  title: string,
  sourceText: string,
): {
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly sourceSection: SourceOutlineSection;
  readonly section: PlannedSection;
  readonly plan: GenerationPlan;
} {
  const key = normalizeTopicKey(title) || "section";
  const blockId = `block-${key}`;
  const source: NormalizedSource = {
    id: `source-${key}`,
    title,
    kind: "plain-text",
    language: "en",
    metadata: {},
    blocks: [
      {
        id: blockId,
        kind: "paragraph",
        text: sourceText,
        order: 0,
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const sourceSection: SourceOutlineSection = {
    id: `source-section-${key}`,
    title,
    order: 0,
    startOffset: 0,
    endOffset: sourceText.length,
    tokenWeight: Math.max(1, sourceText.split(/\s+/).length),
    sourceBlockIds: [blockId],
    blockIds: [blockId],
    roughStartBlockId: blockId,
    roughEndBlockId: blockId,
    tags: ["concept"],
    confidence: 1,
  };
  const outline: SourceOutline = {
    id: `outline-${key}`,
    sourceId: source.id,
    title,
    sections: [sourceSection],
  };
  const section = createPlannedSection(sourceSection, 0);
  const plan: GenerationPlan = {
    id: `plan-${key}`,
    sourceId: source.id,
    outlineId: outline.id,
    title,
    sections: [section],
    metadata: {
      sectionCount: 1,
      sourceBlockCount: 1,
    },
  };

  return { source, outline, sourceSection, section, plan };
}

function numberedListSource(
  title: string,
  items: readonly string[],
): string {
  return `${title}: ${items
    .map((item, index) => `${index + 1}. ${item}`)
    .join(" ")}`;
}

function bulletListSource(title: string, items: readonly string[]): string {
  return `${title} ${items.map((item) => `\u2022 ${item}`).join(" ")}`;
}

function sourceItemTexts(
  sourceSpanText: string,
  sectionTitle: string,
): readonly string[] {
  return extractCleanSourceItems({
    sourceSpanText,
    sectionTitle,
  }).map((item) => item.text);
}

function hasUnsupportedToken(
  result: SectionGroundingResult | undefined,
  pattern: RegExp,
): boolean {
  return (
    result?.issues.some(
      (issue) =>
        issue.type === "grounding-fabrication" &&
        issue.offendingText?.some((token) => pattern.test(token)),
    ) ?? false
  );
}

async function createItSecurityContext(title: string): Promise<{
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly sourceSection: SourceOutlineSection;
  readonly section: PlannedSection;
  readonly plan: GenerationPlan;
}> {
  const text = await readItSecurityFixture();
  const source = await normalizeSource({
    id: "it-security-grounding-source",
    title: "Intro to IT Security Module 1",
    kind: "plain-text",
    language: "en",
    text,
    createdAt: "2026-01-01T00:00:00.000Z",
  });
  const outline = await detectOutline(source);
  const sourceSection = requireSourceSection(outline, title);
  const section = createPlannedSection(sourceSection, 0);
  const plan: GenerationPlan = {
    id: `grounding-plan-${normalizeTopicKey(title)}`,
    sourceId: source.id,
    outlineId: outline.id,
    title: source.title,
    sections: [section],
    metadata: {
      sectionCount: 1,
      sourceBlockCount: source.blocks.length,
    },
  };

  return { source, outline, sourceSection, section, plan };
}

function createPlannedSection(
  sourceSection: SourceOutlineSection,
  order: number,
): PlannedSection {
  return {
    id: `planned-${normalizeTopicKey(sourceSection.title)}-${order}`,
    sourceSectionId: sourceSection.id,
    title: sourceSection.title,
    order,
    schemaKind: "concept-card",
    target: {
      objective: `Explain ${sourceSection.title}.`,
      itemCount: 1,
      focus: sourceSection.title,
      requiredSourceBlockIds: [...sourceSection.sourceBlockIds],
      expectedTags: ["concept"],
      coverageRules: ["Represent only the source section."],
    },
    sourceBlockIds: [...sourceSection.sourceBlockIds],
    tokenWeight: sourceSection.tokenWeight,
    targetItemCount: 1,
    sourceStartOffset: sourceSection.startOffset,
    sourceEndOffset: sourceSection.endOffset,
  };
}

function createOutput(
  section: PlannedSection,
  explanation: string,
  keyPoints: readonly string[],
): SectionOutput {
  return {
    id: `output-${section.id}`,
    kind: "concept-card",
    plannedSectionId: section.id,
    title: section.title,
    sourceBlockIds: [...section.sourceBlockIds],
    sourceCore: {
      explanation,
      keyPoints,
    },
    enrichment: null,
  };
}

function extractSourceSectionText(
  source: NormalizedSource,
  sourceSection: SourceOutlineSection,
): string {
  const sourceBlockIds = new Set([
    ...sourceSection.sourceBlockIds,
    ...sourceSection.blockIds,
  ]);
  const orderedBlocks = source.blocks
    .map((block, inputIndex) => ({ block, inputIndex }))
    .sort(
      (left, right) =>
        left.block.order - right.block.order ||
        left.inputIndex - right.inputIndex,
    )
    .map(({ block }) => block);
  const fragments = flattenSourceBlocks(removeConsecutiveDuplicateBlocks(orderedBlocks))
    .filter(({ block }) => sourceBlockIds.has(block.id))
    .map(({ block, startOffset, endOffset }) => {
      const start = Math.max(startOffset, sourceSection.startOffset);
      const end = Math.min(endOffset, sourceSection.endOffset);
      return start < end
        ? block.text.slice(start - startOffset, end - startOffset).trim()
        : "";
    })
    .filter((text) => text.length > 0);

  return fragments.join("\n").trim();
}

function removeConsecutiveDuplicateBlocks(
  blocks: readonly NormalizedSource["blocks"][number][],
): readonly NormalizedSource["blocks"][number][] {
  const uniqueBlocks: NormalizedSource["blocks"][number][] = [];
  let previousText: string | undefined;

  for (const block of blocks) {
    if (block.text === previousText) {
      continue;
    }
    uniqueBlocks.push(block);
    previousText = block.text;
  }

  return uniqueBlocks;
}

async function readItSecurityFixture(): Promise<string> {
  const candidates = [
    join(process.cwd(), "scripts", "fixtures", "it-security.txt"),
    join(
      process.cwd(),
      "packages",
      "engine",
      "scripts",
      "fixtures",
      "it-security.txt",
    ),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf8");
    } catch {
      continue;
    }
  }

  throw new Error("Unable to read IT Security fixture.");
}

function requireSourceSection(
  outline: SourceOutline,
  title: string,
): SourceOutlineSection {
  const key = normalizeTopicKey(title);
  const section = outline.sections.find(
    (candidate) => normalizeTopicKey(candidate.title) === key,
  );
  if (!section) {
    throw new Error(`Eval setup could not find source section "${title}".`);
  }
  return section;
}

function normalizeTopicKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(?:a|an|the)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}
