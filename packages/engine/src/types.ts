export interface NormalizedSource {
  id: string;
  title: string;
  content: string;
}

export interface OutlineSection {
  id: string;
  title: string;
  sourceRange?: Readonly<{ start: number; end: number }>;
}

export interface SourceOutline {
  sourceId: string;
  sections: OutlineSection[];
}

export interface GenerationPlanSection {
  id: string;
  title: string;
  objective: string;
}

export interface GenerationPlan {
  sourceId: string;
  sections: GenerationPlanSection[];
}

export interface SectionOutput {
  sectionId: string;
  content: string;
}

export interface CoverageIssue {
  sectionId: string;
  reason: string;
}

export interface CoverageReport {
  complete: boolean;
  issues: CoverageIssue[];
}

export interface ReviewerOutput {
  title: string;
  sections: SectionOutput[];
}
