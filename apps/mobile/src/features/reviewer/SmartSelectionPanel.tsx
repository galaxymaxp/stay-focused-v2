import {
  STUDY_ACTIONS, STUDY_ACTION_LABELS, STUDY_ACTION_TITLES, STUDY_ASK_SUGGESTIONS, STUDY_GROUNDING_DETAILS, STUDY_GROUNDING_LABELS, STUDY_LIMITS,
  STUDY_MODIFIER_LABELS, STUDY_QUESTION_TOO_LONG, STUDY_REFINEMENTS, STUDY_SELECTION_TOO_LARGE, STUDY_TOOLS_PROMPT_VERSION, checkStudySelection,
  studySurface, type AssistSelection, type StudyAction, type StudyFollowUp, type StudyGrounding, type StudyModifier,
  type StudyToolRequest, type StudyToolResult,
} from '@stay-focused/shared';
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Pressable, TextInput, View, useWindowDimensions, type GestureResponderEvent, type ScrollView } from 'react-native';
import { useAuth } from '../../auth';
import { getApiBaseUrl } from '../../config/apiBaseUrl';
import { haptic } from '../../design/haptics';
import { Action, Copy, Notice, SkeletonBlock } from '../../design/primitives';
import { useTheme } from '../../design/theme';
import { radius, spacing } from '../../design/tokens';
import { createStudyToolsSession, StudyToolsError } from '../../services/studyTools';

type Range = { start: number; end: number };
type Run = { status: 'pending' } | { status: 'ready'; result: StudyToolResult } | { status: 'error'; message: string };
type Extra = Pick<StudyToolRequest, 'modifier' | 'question' | 'answer' | 'previous' | 'followUps'>;
type TestState = { question: Run | null; answer: string; checked: Run | null; choices: Run | null; explained: Run | null };
type AskTurn = { question: string; run: Run };
const EMPTY_TEST: TestState = { question: null, answer: '', checked: null, choices: null, explained: null };
const VERDICTS = { correct: 'Correct', partial: 'Partially correct', incorrect: 'Try again' } as const;
const stop = (event: GestureResponderEvent) => event.stopPropagation();

/**
 * Smart Selection inside the Reviewer's Study Assist sheet. The whole concept
 * is a selectable surface: Android's own handles and Copy/Select all choose an
 * exact range, then Define, Explain, Example, Test Me or Ask run on it here.
 * Refinements generate only when tapped; repeats reuse this session's results.
 */
export function SmartSelectionPanel({ selection, onActiveChange, scrollRef }: { selection: AssistSelection; onActiveChange?: (active: boolean) => void; scrollRef?: RefObject<ScrollView | null> }) {
  const { session } = useAuth();
  const { colors, reducedMotion } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const surface = useMemo(() => studySurface(selection.block), [selection.block]);
  // Nothing is selected until the student holds a word; whole-topic quick assists show until then.
  const [range, setRange] = useState<Range>({ start: 0, end: 0 });
  const picked = surface.slice(Math.min(range.start, range.end), Math.max(range.start, range.end));
  const check = checkStudySelection(selection.block, picked);
  const [action, setAction] = useState<StudyAction | null>(null);
  // The selection an action ran on stays fixed while its results are shown.
  const [subject, setSubject] = useState('');
  const [shown, setShown] = useState<{ modifier?: StudyModifier; run: Run } | null>(null);
  const [test, setTest] = useState<TestState>(EMPTY_TEST);
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [draft, setDraft] = useState('');
  const studySession = useRef(createStudyToolsSession()).current;
  const first = useRef<string | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  // A selection (even an oversized one) or an open action replaces the whole-topic quick assists.
  const selecting = action !== null || check.ok || check.reason === 'too_large';
  useEffect(() => onActiveChange?.(selecting), [selecting, onActiveChange]);
  const input = useRef<TextInput>(null);
  const root = useRef<View>(null);
  const answerField = useRef<TextInput>(null);
  const askField = useRef<TextInput>(null);
  // The sheet's Modal does not resize for the keyboard. While typing, add room
  // below and scroll the field to the top of the sheet, clear of any keyboard.
  const [typing, setTyping] = useState(false);
  function reveal(field: RefObject<TextInput | null>) {
    setTyping(true);
    setTimeout(() => {
      const scroll = scrollRef?.current;
      if (!field.current || !scroll || !root.current) return;
      field.current.measureLayout(root.current, (_x, y) => scroll.scrollTo({ y: Math.max(0, y - spacing[8]), animated: !reducedMotion }), () => undefined);
    }, 80);
  }
  // Returning from an action restores the previous range: focus without a keyboard
  // so it shows as a native selection. Focusing reports a collapsed cursor that can
  // land after it, so collapsed reports count only once the student touches the text.
  const touched = useRef(false);
  useEffect(() => {
    if (action || range.start === range.end) return;
    touched.current = false;
    const apply = () => input.current?.setSelection?.(range.start, range.end);
    const timers = [setTimeout(() => {
      input.current?.focus();
      apply();
    }, 120), setTimeout(() => { if (!touched.current) apply(); }, 450)];
    return () => timers.forEach(clearTimeout);
    // Only when the surface (re)appears; handle drags update `range` themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  function run(text: string, act: StudyAction, extra: Extra, apply: (run: Run) => void) {
    apply({ status: 'pending' });
    const request: StudyToolRequest = { reviewerId: selection.reviewerId, sectionId: selection.sectionId, blockId: selection.blockId,
      contentHash: selection.contentHash, promptVersion: STUDY_TOOLS_PROMPT_VERSION, selection: text, action: act,
      ...Object.fromEntries(Object.entries(extra).filter(([, value]) => value !== undefined)) };
    const client = { baseUrl: getApiBaseUrl() ?? '', accessToken: session?.accessToken ?? '' };
    studySession.run(client, request).then(result => {
      if (mounted.current) { haptic.success(); apply({ status: 'ready', result }); }
    }, (error: unknown) => {
      if (mounted.current) apply({ status: 'error', message: error instanceof StudyToolsError ? error.message : 'The learning tool is temporarily unavailable. Try again shortly.' });
    });
  }
  function choose(next: StudyAction) {
    const text = action ? subject : picked;
    if (!action && !check.ok) return;
    haptic.tap();
    setAction(next);
    setSubject(text);
    first.current = undefined;
    setShown(null);
    setTest(EMPTY_TEST);
    setTurns([]);
    setDraft('');
    if (next === 'test') run(text, 'test', {}, question => setTest({ ...EMPTY_TEST, question }));
    else if (next !== 'ask') run(text, next, {}, value => {
      first.current = value.status === 'ready' ? value.result.text : undefined;
      setShown({ run: value });
    });
  }
  function refine(modifier: StudyModifier) {
    if (!action || action === 'test' || action === 'ask') return;
    haptic.select();
    // "Another" must differ from what is on screen; other refinements rework the first result.
    const base = modifier === 'another' && shown?.run.status === 'ready' ? shown.run.result.text : first.current;
    run(subject, action, { modifier, ...(base ? { previous: base.slice(0, STUDY_LIMITS.previous) } : {}) }, value => setShown({ modifier, run: value }));
  }
  const question = test.question?.status === 'ready' ? test.question.result.question : undefined;
  function nextQuestion(modifier?: 'another' | 'harder' | 'apply') {
    haptic.select();
    run(subject, 'test', { ...(modifier ? { modifier } : {}), ...(question ? { previous: question } : {}) }, value => setTest({ ...EMPTY_TEST, question: value }));
  }
  function checkAnswer() {
    if (!question || !test.answer.trim() || test.answer.length > STUDY_LIMITS.answer) return;
    haptic.tap();
    // The field may unmount while focused, so its blur never clears the typing room.
    setTyping(false);
    run(subject, 'test', { modifier: 'check', question, answer: test.answer.trim() }, checked => setTest(current => ({ ...current, checked })));
  }
  function ask(text = draft) {
    const asked = text.trim();
    if (!asked || asked.length > STUDY_LIMITS.question || turns.length > STUDY_LIMITS.followUps) return;
    haptic.tap();
    const followUps: StudyFollowUp[] = turns.flatMap(turn => turn.run.status === 'ready' && turn.run.result.text ? [{ question: turn.question, answer: turn.run.result.text.slice(0, STUDY_LIMITS.previous) }] : []);
    const index = turns.length;
    setTyping(false);
    setDraft('');
    setTurns(current => [...current, { question: asked, run: { status: 'pending' } }]);
    run(subject, 'ask', { question: asked, ...(followUps.length ? { followUps } : {}) }, value =>
      setTurns(current => current.map((turn, position) => position === index ? { ...turn, run: value } : turn)));
  }

  return <View ref={root} collapsable={false} style={{ gap: spacing[3] }}>
    {action ? <View style={{ gap: spacing[2], backgroundColor: colors.surfaceSecondary, borderRadius: radius.control, padding: spacing[4] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Copy size="caption" color={colors.textMuted} style={{ flex: 1, fontWeight: '700', letterSpacing: 0.8 }}>SELECTED</Copy>
        <Pressable accessibilityRole="button" onPress={() => { haptic.select(); setAction(null); }} hitSlop={8}>
          <Copy size="caption" color={colors.accent} style={{ fontWeight: '600' }}>Change selection</Copy>
        </Pressable>
      </View>
      <Copy size="bodySmall" numberOfLines={5} style={{ lineHeight: 21 }}>{`“${subject}”`}</Copy>
    </View> : <View style={{ gap: spacing[2] }}>
      <Copy muted size="caption">Hold any word, then drag the handles to choose exactly what to study.</Copy>
      {/* Touches stay on the text so dragging a selection never moves the sheet. */}
      <View onTouchStart={event => { touched.current = true; stop(event); }} onTouchMove={stop} onTouchEnd={stop} style={{ backgroundColor: colors.surfaceSecondary, borderRadius: radius.control, paddingHorizontal: spacing[3], paddingVertical: spacing[2] }}>
        <TextInput
          ref={input}
          testID="smart-selection-surface"
          accessibilityLabel="Concept text. Select the words you want to study."
          value={surface}
          onChangeText={() => undefined}
          onSelectionChange={event => {
            const next = event.nativeEvent.selection;
            if (touched.current || next.start !== next.end) setRange(next);
          }}
          multiline
          scrollEnabled={false}
          showSoftInputOnFocus={false}
          caretHidden
          autoCorrect={false}
          spellCheck={false}
          textAlignVertical="top"
          selectionColor={colors.findActive}
          style={{ color: colors.textPrimary, fontSize: 15, lineHeight: 23, padding: 0 }}
        />
      </View>
      {check.ok ? <Copy size="bodySmall" numberOfLines={3} style={{ lineHeight: 20 }}>
        <Copy size="caption" color={colors.textMuted} style={{ fontWeight: '700' }}>Selected  </Copy>{`“${check.text}”`}
      </Copy> : check.reason === 'too_large' ? <Notice>{STUDY_SELECTION_TOO_LARGE}</Notice> : null}
    </View>}
    {selecting ? <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 6 }}>
      {STUDY_ACTIONS.map(item => {
        const current = action === item;
        const disabled = !action && !check.ok;
        return <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: current, disabled }} disabled={disabled} onPress={() => choose(item)}
          style={({ pressed }) => ({ flex: 1, minHeight: 40, paddingHorizontal: 2, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center',
            backgroundColor: current ? colors.accent : colors.surfaceSecondary, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}>
          <Copy size="caption" numberOfLines={1} color={current ? colors.onAccent : colors.textPrimary} style={{ fontWeight: '600' }}>{STUDY_ACTION_LABELS[item]}</Copy>
        </Pressable>;
      })}
    </View> : null}
    {action && action !== 'test' && action !== 'ask' ? <View style={{ gap: spacing[3] }}>
      <Copy size="h3" style={{ fontWeight: '600' }}>{shown?.modifier ? `${STUDY_ACTION_TITLES[action]} · ${STUDY_MODIFIER_LABELS[shown.modifier]}` : STUDY_ACTION_TITLES[action]}</Copy>
      {shown ? <RunView run={shown.run} retry={() => shown.modifier ? refine(shown.modifier) : choose(action)}>
        {result => <ResultCard result={result} />}
      </RunView> : null}
      <Chips items={STUDY_REFINEMENTS[action]} selected={shown?.modifier} disabled={shown?.run.status === 'pending'} onPress={refine} />
    </View> : null}
    {action === 'test' ? <View style={{ gap: spacing[3] }}>
      <Copy size="h3" style={{ fontWeight: '600' }}>{STUDY_ACTION_TITLES.test}</Copy>
      {test.question ? <RunView run={test.question} retry={() => nextQuestion()}>
        {result => result.outcome === 'insufficient' ? <Notice>{result.text}</Notice> : <View style={{ gap: spacing[3] }}>
          <Copy style={{ lineHeight: 25, fontWeight: '600' }}>{result.question}</Copy>
          {test.choices?.status === 'ready' && test.choices.result.choices ? <View accessibilityRole="radiogroup" style={{ gap: spacing[2] }}>
            {test.choices.result.choices.map(choice => <Pressable key={choice} accessibilityRole="radio" accessibilityState={{ selected: test.answer === choice }} disabled={!!test.checked}
              onPress={() => { haptic.select(); setTest(current => ({ ...current, answer: choice })); }}
              style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing[3], borderRadius: radius.control, borderWidth: 1.5, borderColor: test.answer === choice ? colors.accent : 'transparent', backgroundColor: colors.surfaceSecondary }}>
              <Copy size="bodySmall">{choice}</Copy>
            </Pressable>)}
          </View> : <TextInput ref={answerField} onFocus={() => reveal(answerField)} onBlur={() => setTyping(false)} accessibilityLabel="Your answer" placeholder="Your answer…" placeholderTextColor={colors.textMuted} value={test.answer} editable={!test.checked}
            onChangeText={answer => setTest(current => ({ ...current, answer }))} multiline
            style={{ minHeight: 64, maxHeight: 150, padding: spacing[3], borderRadius: radius.control, borderWidth: 1, borderColor: colors.separator, color: colors.textPrimary, backgroundColor: colors.surfaceSecondary, textAlignVertical: 'top' }} />}
          {test.answer.length > STUDY_LIMITS.answer ? <Copy size="caption" color={colors.danger}>Shorten your answer to the key idea.</Copy> : null}
          {!test.checked || test.checked.status === 'error' ? <>
            <Action disabled={!test.answer.trim() || test.answer.length > STUDY_LIMITS.answer} onPress={checkAnswer}>Check Answer</Action>
            {test.checked?.status === 'error' ? <Notice>{test.checked.message}</Notice> : null}
            <View style={{ flexDirection: 'row', gap: spacing[4] }}>
              {!test.choices ? <TextLink onPress={() => run(subject, 'test', { modifier: 'choices', question: result.question }, choices => setTest(current => ({ ...current, choices })))}>Need choices?</TextLink> : null}
              <TextLink onPress={() => run(subject, 'test', { modifier: 'explain_answer', question: result.question }, explained => setTest(current => ({ ...current, explained })))}>Show answer</TextLink>
            </View>
            {test.choices?.status === 'pending' ? <SkeletonBlock width="70%" height={12} /> : test.choices?.status === 'error' ? <Notice>{test.choices.message}</Notice> : null}
          </> : <RunView run={test.checked} retry={checkAnswer}>
            {checked => checked.outcome === 'insufficient' ? <Notice>{checked.text}</Notice> : <View style={{ gap: spacing[2], backgroundColor: colors.surfacePrimary, borderRadius: radius.card, borderWidth: 1, borderColor: colors.separator, padding: spacing[4] }}>
              <Copy size="bodySmall" color={checked.verdict === 'correct' ? colors.green : checked.verdict === 'partial' ? colors.blue : colors.warning} style={{ fontWeight: '700' }}>{VERDICTS[checked.verdict ?? 'incorrect']}</Copy>
              <Copy style={{ lineHeight: 24 }}>{checked.text}</Copy>
            </View>}
          </RunView>}
          {test.explained ? <RunView run={test.explained} retry={() => run(subject, 'test', { modifier: 'explain_answer', question: result.question }, explained => setTest(current => ({ ...current, explained })))}>
            {explained => <ResultCard result={explained} />}
          </RunView> : null}
          {test.checked?.status === 'ready' ? <Chips items={STUDY_REFINEMENTS.test} disabled={test.explained?.status === 'pending'} onPress={modifier => modifier === 'explain_answer'
            ? run(subject, 'test', { modifier, question: result.question }, explained => setTest(current => ({ ...current, explained })))
            : nextQuestion(modifier as 'another' | 'harder' | 'apply')} /> : null}
        </View>}
      </RunView> : null}
    </View> : null}
    {action === 'ask' ? <View style={{ gap: spacing[3] }}>
      <Copy size="h3" style={{ fontWeight: '600' }}>{STUDY_ACTION_TITLES.ask}</Copy>
      {turns.map((turn, index) => <View key={index} style={{ gap: spacing[2] }}>
        <Copy size="bodySmall" style={{ fontWeight: '600' }}>{turn.question}</Copy>
        <RunView run={turn.run}>{result => <ResultCard result={result} />}</RunView>
      </View>)}
      {turns.length > STUDY_LIMITS.followUps ? <Action secondary onPress={() => { haptic.select(); setTurns([]); }}>New question</Action>
        : turns.some(turn => turn.run.status === 'pending') ? null : <>
          {turns.length === 0 ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
            {STUDY_ASK_SUGGESTIONS.map(suggestion => <Chip key={suggestion} label={suggestion} onPress={() => ask(suggestion)} />)}
          </View> : null}
          <TextInput ref={askField} onFocus={() => reveal(askField)} onBlur={() => setTyping(false)} accessibilityLabel={turns.length ? 'Ask a follow-up' : 'Ask about the selected text'} placeholder={turns.length ? 'Ask a follow-up…' : 'Ask something about the selected text...'}
            placeholderTextColor={colors.textMuted} value={draft} onChangeText={setDraft} multiline
            style={{ minHeight: 64, maxHeight: 150, padding: spacing[3], borderRadius: radius.control, borderWidth: 1, borderColor: draft.length > STUDY_LIMITS.question ? colors.danger : colors.separator, color: colors.textPrimary, backgroundColor: colors.surfaceSecondary, textAlignVertical: 'top' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
            <Copy size="caption" color={draft.length > STUDY_LIMITS.question ? colors.danger : colors.textMuted} style={{ flex: 1 }}>
              {draft.length > STUDY_LIMITS.question ? STUDY_QUESTION_TOO_LONG : `${draft.length}/${STUDY_LIMITS.question}${turns.length ? ` · ${STUDY_LIMITS.followUps + 1 - turns.length} follow-up${STUDY_LIMITS.followUps + 1 - turns.length === 1 ? '' : 's'} left` : ''}`}
            </Copy>
            <Action disabled={!draft.trim() || draft.length > STUDY_LIMITS.question} onPress={() => ask()}>Ask</Action>
          </View>
        </>}
    </View> : null}
    {typing ? <View style={{ height: Math.round(windowHeight * 0.5) }} /> : null}
  </View>;
}

function RunView({ run, retry, children }: { run: Run; retry?: () => void; children: (result: StudyToolResult) => ReactNode }) {
  if (run.status === 'pending') return <View accessibilityLiveRegion="polite" style={{ gap: spacing[2], paddingTop: spacing[1] }}>
    <SkeletonBlock width="92%" height={12} />
    <SkeletonBlock width="84%" height={12} />
    <SkeletonBlock width="60%" height={12} />
  </View>;
  if (run.status === 'error') return <View style={{ gap: spacing[2] }}>
    <Notice>{run.message}</Notice>
    {retry ? <TextLink onPress={retry}>Try again</TextLink> : null}
  </View>;
  return <>{children(run.result)}</>;
}

function ResultCard({ result }: { result: StudyToolResult }) {
  const { colors } = useTheme();
  return <View accessibilityLiveRegion="polite" style={{ gap: spacing[2], backgroundColor: colors.surfacePrimary, borderRadius: radius.card, borderWidth: 1, borderColor: colors.separator, padding: spacing[4] }}>
    {result.outcome === 'not_applicable' ? null : <GroundingBadge grounding={result.grounding} />}
    <Copy style={{ lineHeight: 25 }}>{result.text}</Copy>
  </View>;
}

/** Student-facing provenance; tapping explains it. No scores or internal identifiers. */
export function GroundingBadge({ grounding }: { grounding: StudyGrounding }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return <View style={{ gap: spacing[1] }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${STUDY_GROUNDING_LABELS[grounding]}. Tap for details`} accessibilityState={{ expanded: open }}
      onPress={() => setOpen(value => !value)} hitSlop={6}
      style={{ alignSelf: 'flex-start', backgroundColor: grounding === 'source' ? colors.greenSoft : colors.surfaceSecondary, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Copy size="caption" color={grounding === 'source' ? colors.green : colors.textSecondary} style={{ fontWeight: '700' }}>{STUDY_GROUNDING_LABELS[grounding]}</Copy>
    </Pressable>
    {open ? <Copy muted size="caption">{STUDY_GROUNDING_DETAILS[grounding]}</Copy> : null}
  </View>;
}

function Chips<T extends StudyModifier>({ items, selected, disabled, onPress }: { items: readonly T[]; selected?: StudyModifier; disabled?: boolean; onPress: (item: T) => void }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
    {items.map(item => <Chip key={item} label={STUDY_MODIFIER_LABELS[item]} selected={selected === item} disabled={disabled} onPress={() => onPress(item)} />)}
  </View>;
}
function Chip({ label, selected = false, disabled = false, onPress }: { label: string; selected?: boolean; disabled?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1.5,
      borderColor: selected ? colors.accent : 'transparent', backgroundColor: colors.surfaceSecondary, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 })}>
    <Copy size="caption" color={colors.textPrimary} style={{ fontWeight: '600' }}>{label}</Copy>
  </Pressable>;
}
function TextLink({ onPress, children }: { onPress: () => void; children: string }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
    <Copy size="caption" color={colors.accent} style={{ fontWeight: '600' }}>{children}</Copy>
  </Pressable>;
}
