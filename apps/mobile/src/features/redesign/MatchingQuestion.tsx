import type { QuizMatchPair, QuizMatchingQuestion, QuizMatchingQuestionResult } from '@stay-focused/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { Action, Copy, Surface } from '../../design/primitives';

export function MatchingQuestion({ question, pairs, disabled, onChange }: {
  question: QuizMatchingQuestion;
  pairs: readonly QuizMatchPair[];
  disabled: boolean;
  onChange: (pairs: QuizMatchPair[]) => void;
}) {
  const [leftId, setLeftId] = useState<string | null>(null);
  const active = question.leftItems.find(item => item.id === leftId);
  return (
    <View style={{ gap: 12 }}>
      <Copy muted>Select an item, then choose its matching answer. Choosing an answer already in use clears its previous pairing.</Copy>
      <Copy size="h3">Items to match</Copy>
      {question.leftItems.map(left => {
        const pair = pairs.find(p => p.leftItemId === left.id);
        const right = question.rightItems.find(item => item.id === pair?.rightItemId);
        return (
          <Surface key={left.id}>
            <Action secondary={leftId !== left.id} disabled={disabled} label={`Match ${left.label}`} onPress={() => setLeftId(left.id)}>{left.label}</Action>
            <Copy muted>{right ? `Paired with: ${right.label}` : 'Not paired yet'}</Copy>
          </Surface>
        );
      })}
      <Copy size="h3">Matching answers</Copy>
      <Copy muted>{active ? `Choose an answer for: ${active.label}` : 'Select an item above to pair it.'}</Copy>
      {question.rightItems.map(right => (
        <Action key={right.id} secondary={!pairs.some(p => p.leftItemId === leftId && p.rightItemId === right.id)} disabled={disabled || !active}
          label={`Use ${right.label}`} onPress={() => {
            if (!active) return;
            onChange([...pairs.filter(p => p.leftItemId !== active.id && p.rightItemId !== right.id), { leftItemId: active.id, rightItemId: right.id }]);
          }}>{right.label}</Action>
      ))}
      {active && pairs.some(p => p.leftItemId === active.id) && (
        <Action secondary disabled={disabled} onPress={() => onChange(pairs.filter(p => p.leftItemId !== active.id))}>Clear pairing</Action>
      )}
    </View>
  );
}

/** IDs join persisted public labels only. No ID fallback is rendered. */
export function MatchingFeedback({ question, feedback }: { question: QuizMatchingQuestion; feedback: QuizMatchingQuestionResult }) {
  return (
    <Surface>
      <Copy size="h3">Matching review</Copy>
      {question.leftItems.map(left => {
        const submitted = feedback.pairs.find(p => p.leftItemId === left.id);
        const expected = feedback.correctPairs.find(p => p.leftItemId === left.id);
        const answer = question.rightItems.find(right => right.id === submitted?.rightItemId);
        const correct = question.rightItems.find(right => right.id === expected?.rightItemId);
        return <View key={left.id} style={{ gap: 4 }}>
          <Copy>{left.label} → {answer?.label ?? 'Answer unavailable'}</Copy>
          <Copy muted>Correct match: {correct?.label ?? 'Answer unavailable'}</Copy>
        </View>;
      })}
    </Surface>
  );
}
