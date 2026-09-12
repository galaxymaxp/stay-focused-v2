export type ActivityType = 'research' | 'essay' | 'reflection' | 'question_answer' | 'worksheet' | 'lab_report' | 'case_analysis' | 'technical_activity' | 'programming' | 'presentation' | 'documentation' | 'calculation' | 'custom';
export type ActivitySourceRole = 'instructions' | 'template' | 'reference' | 'course_material' | 'attachment';
export interface ActivitySource {
    readonly id: string;
    readonly title: string;
    readonly role: ActivitySourceRole;
    readonly text: string;
    readonly materialId: string | null;
}
export interface TaskSpecification {
    readonly context?: {
        readonly courseId: string;
        readonly courseTitle: string;
        readonly moduleIds: readonly string[];
    };
    readonly activityId: string;
    readonly activityType: ActivityType;
    readonly requestedDeliverable: string;
    readonly instructions: string;
    readonly requiredSections: readonly string[];
    readonly requiredQuestions: readonly string[];
    readonly requiredOrder: readonly string[];
    readonly formattingRequirements: readonly string[];
    readonly wordOrLengthRequirements: {
        readonly minWords: number | null;
        readonly maxWords: number | null;
        readonly paragraphs: number | null;
        readonly items: number | null;
        readonly slides: number | null;
    };
    readonly requiredArtifacts: readonly string[];
    readonly providedTemplate: string | null;
    readonly templateStructure: readonly string[];
    readonly sourceRequirements: readonly string[];
    readonly constraints: readonly string[];
}
export interface ActivityDraftSection {
    readonly id: string;
    readonly heading: string | null;
    readonly level: number;
    readonly content: string;
    readonly order: number;
    readonly sourceRefs: readonly string[];
}
export interface ActivityDraftSlide {
    readonly number: number;
    readonly title: string;
    readonly body: string;
    readonly speakerNotes: string | null;
    readonly sourceRefs: readonly string[];
}
export interface ActivityDraftContent {
    readonly title: string;
    readonly sections: readonly ActivityDraftSection[];
    readonly slides: readonly ActivityDraftSlide[];
}
export interface ActivityDraft extends ActivityDraftContent {
    readonly id: string;
    readonly activityId: string;
    readonly courseId: string;
    readonly type: ActivityType;
    readonly sources: readonly {
        readonly id: string;
        readonly title: string;
        readonly role: ActivitySourceRole;
        readonly materialId?: string | null;
        readonly contentSha256?: string;
    }[];
    readonly warnings: readonly {
        readonly code: 'missing_source_information';
        readonly sectionId: string;
        readonly message: string;
    }[];
    readonly generationId: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly editable: true;
    readonly revision: number;
    readonly status: 'draft' | 'edited';
}
