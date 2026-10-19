/** Bundled in both apps so legal pages remain readable without a connection. */
export const LEGAL_CONTACT_EMAIL = 'omgraythekid@gmail.com';

export interface LegalDocument {
  readonly title: string;
  readonly updated: string;
  readonly sections: readonly {
    readonly heading: string;
    readonly paragraphs: readonly string[];
    readonly bullets?: readonly string[];
  }[];
}

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  updated: '2026-10-19',
  sections: [
    { heading: 'About Stay Focused', paragraphs: [
      'Stay Focused is a BSIT student capstone project at the University of the Cordilleras. It is not an official university service and is not affiliated with Instructure or Canvas.',
      'This policy covers the Stay Focused website and mobile app.',
    ] },
    { heading: 'What we collect', paragraphs: ['We store information you provide and information needed for the features you use:'], bullets: [
      'Account email, sign-in details managed by Supabase, and profile information from linked Google or Microsoft accounts, including a name or profile photo when supplied.',
      'Your Canvas address, account identity and personal access token; synced courses, modules, pages, files, assignments, announcements, grades and your submission information.',
      'Uploaded documents and images, extracted text, source snapshots, generated reviewers and quizzes, quiz answers and attempts, activity drafts and saved edits.',
      'Tasks, study plans and sessions, preferences, uploaded avatars, notification device identifiers and push tokens, and processing and delivery records.',
      'On-device copies of saved study work, images, screen snapshots and pending offline edits, plus sign-in and appearance settings.',
    ] },
    { heading: 'How we use it', paragraphs: [
      'We use this information to sign you in, read and organize your coursework, generate study content, save your work, plan study sessions and deliver the notifications you enable. Processing records help run jobs and handle failures.',
      'We do not sell your personal data or use your course material to sell advertising.',
    ] },
    { heading: 'AI and OCR processing', paragraphs: [
      'Course material, uploaded content and relevant prompts are sent to OpenAI to generate or explain study content. Images and document pages that need text recognition are sent to Google Cloud Vision for OCR. Google Cloud workers also process files and background jobs.',
      'These providers process the content under their own policies. Avoid uploading sensitive information or material you do not have permission to share with these services.',
    ] },
    { heading: 'Canvas access', paragraphs: [
      'We use your Canvas token to read coursework and your academic information. The app does not submit assignments or change grades in Canvas. Your token may grant wider permissions than the app uses, so keep it private.',
      'The server stores your token encrypted with AES-256-GCM and decrypts it when needed for Canvas requests. Disconnecting Canvas in Stay Focused clears the stored token, but does not erase saved coursework or generated study work.',
      'To revoke the token itself, open Canvas Account > Settings and remove or revoke the token under Approved Integrations. Revoking it stops future access with that token; it does not delete copies already saved in Stay Focused.',
    ] },
    { heading: 'Services that process information', paragraphs: ['The features you use involve these services, whose own policies also apply:'], bullets: [
      'Supabase: account authentication, database records and file storage. Google or Microsoft: sign-in when you choose or link that provider.',
      'Vercel: the website, API and background workflow hosting. Google Cloud: OCR, file processing and background task infrastructure. OpenAI: AI generation and explanations.',
      'Wikimedia Commons: image searches using topic words derived from reviewer sections, and image delivery. These searches can reveal the topic you are studying.',
      'Resend: notification emails, including the destination email and relevant coursework notification details. Expo: push notification delivery and mobile app updates.',
      'GitHub Releases: public Android release information and APK downloads. Opening a download sends a request to GitHub.',
    ] },
    { heading: 'Sharing', paragraphs: [
      'Creating a reviewer share link makes a snapshot of that reviewer readable by anyone with the link, without signing in. Share only material you are allowed to share. The snapshot does not automatically follow later edits. You can revoke the link, but cannot recall copies others have already made.',
    ] },
    { heading: 'Storage and security', paragraphs: [
      'Saved account data and files are stored with Supabase; hosting and processing services handle data needed for their work. Protected APIs check your sign-in token, and database access rules separate accounts. Private file access is restricted. These safeguards do not guarantee that data can never be lost or accessed without permission.',
    ] },
    { heading: 'Offline data on your device', paragraphs: [
      'The mobile app saves study work and images on your device for offline use and may queue edits for later syncing. Settings lets you clear downloaded study copies. Signing out attempts to clear that account\'s local library and screen snapshots; cleanup can fail. Protect your device and clear app data through your device settings if copies remain.',
      'Files or images you export to your device or share elsewhere are outside the app\'s cleanup. The website also stores a sign-in session, preferences and screen snapshots in browser storage; sign-out clears its account snapshots.',
    ] },
    { heading: 'Retention and deletion', paragraphs: [
      'Saved coursework and study work can remain after you disconnect Canvas or stop using the app. Processing jobs have cleanup rules, but there is no single automatic deletion deadline for all account data.',
      'When a Canvas source is confirmed unavailable or deleted, source checks block affected rebuilds or retries. This does not automatically erase an already saved reviewer, share snapshot or offline copy.',
      `There is no self-service account deletion screen. To request account or stored-content deletion, email ${LEGAL_CONTACT_EMAIL} from your account email. We will need to verify that the account is yours. Provider retention and copies you or other people exported may be outside our control.`,
    ] },
    { heading: 'Children', paragraphs: ['Stay Focused is intended for university students and is not for children under 13. If you believe a child under 13 has provided information, contact us to request its removal.'] },
    { heading: 'Changes', paragraphs: ['We may update this policy as the project changes. Read the updated date on this page for the latest version.'] },
    { heading: 'Contact', paragraphs: [`For privacy questions or deletion requests, email ${LEGAL_CONTACT_EMAIL}.`] },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  title: 'Terms of Service',
  updated: '2026-10-19',
  sections: [
    { heading: 'What the app is', paragraphs: [
      'Stay Focused helps you organize coursework, make study materials and plan study time. By creating an account or using the service, you agree to these terms and acknowledge the Privacy Policy.',
      'This is a BSIT student capstone project at the University of the Cordilleras, not an official university service. It is not affiliated with Instructure or Canvas.',
    ] },
    { heading: 'Accounts and your Canvas token', paragraphs: [
      'Use your own account and keep your password and Canvas personal access token private. You are responsible for activity through your account. Only connect a Canvas account you are allowed to access.',
      'Canvas access is used to read your coursework, not to submit assignments or change grades. You can disconnect Canvas in the app and revoke the token in Canvas Account > Settings > Approved Integrations.',
    ] },
    { heading: 'Acceptable use', paragraphs: ['Use Stay Focused for your own study and only with material you are permitted to use.'], bullets: [
      'Respect your school\'s academic integrity rules, your instructor\'s directions, copyright and other people\'s privacy.',
      'Do not upload or share course material without the required permission, or present AI-generated work as your own when your school prohibits it.',
      'Do not try to access another account, bypass access controls, abuse generation limits or disrupt the service.',
    ] },
    { heading: 'AI output can be wrong', paragraphs: [
      'Reviewers, quizzes, explanations, drafts and plans may contain errors or leave out important details. Check them against your course material and use your own judgment. They are study aids, not a substitute for your instructor or official course requirements.',
    ] },
    { heading: 'Shared links', paragraphs: [
      'A reviewer share link shows a saved snapshot to anyone who has the link. Only share content you have permission to distribute. Later edits do not update that snapshot. Revoking a link prevents future reads through it but cannot remove copies already made by others.',
    ] },
    { heading: 'Availability', paragraphs: [
      'Stay Focused is provided as is as a student project. Features may change or be interrupted, and AI, OCR, Canvas or other services may be unavailable. We cannot promise uninterrupted access, correct output or permanent storage. Keep your own copies of important work.',
    ] },
    { heading: 'Ending use', paragraphs: [
      `You can stop using Stay Focused, sign out, disconnect Canvas and revoke your Canvas token at any time. These actions do not delete all saved server data. Email ${LEGAL_CONTACT_EMAIL} to request account or content deletion.`,
    ] },
    { heading: 'Changes', paragraphs: ['We may revise these terms as the project changes. The updated date identifies this version. Read the latest terms before continuing to use the service.'] },
    { heading: 'Contact', paragraphs: [`For questions about these terms, email ${LEGAL_CONTACT_EMAIL}.`] },
  ],
};
