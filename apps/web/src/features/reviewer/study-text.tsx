import { parseStudyText, type StudyInline } from '@stay-focused/shared';

function Inline({ content }: { content: readonly StudyInline[] }) {
  return <>{content.map((part, i) => part.bold ? <strong key={i}>{part.text}</strong> : part.text)}</>;
}

export function StudyText({ text }: { text: string }) {
  return <div className="study-text">{parseStudyText(text).map((block, i) => block.kind === 'paragraph'
    ? <p key={i}><Inline content={block.content} /></p>
    : block.kind === 'bullets' ? <ul key={i}>{block.items.map((content, j) => <li key={j}><Inline content={content} /></li>)}</ul>
      : <ol key={i}>{block.items.map((item, j) => <li key={j} value={item.number}><Inline content={item.content} /></li>)}</ol>)}</div>;
}
