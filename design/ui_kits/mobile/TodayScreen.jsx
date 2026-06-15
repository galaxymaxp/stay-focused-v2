/* Today Schedule — the primary Stay Focused V2 surface.
 * Answers one question: "what should I do right now?"
 * Glass chrome (nav, tab bar, FAB) over flat content (hero + schedule rail). */

const { NowHero, ScheduleBlock, ScheduleGroup, GlassNavBar, GlassTabBar, GlassFAB, Button, Chip } =
  window.StayFocusedDesignSystem_d2c06c;

// ---- inline icon set (stroke style matches Lucide) ----
function I(props) {
  const { d, fill = "none", s = 22, sw = 1.8 } = props;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={fill === "none" ? "currentColor" : "none"}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  );
}
const Icons = {
  play: (s) => <I s={s} fill="currentColor" d={<polygon points="6 3 20 12 6 21 6 3" />} />,
  plus: (s) => <I s={s} sw={2} d={<><path d="M5 12h14M12 5v14" /></>} />,
  bell: (s) => <I s={s} d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>} />,
  today: (s) => <I s={s} d={<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="m9 16 2 2 4-4" /></>} />,
  book: (s) => <I s={s} d={<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>} />,
  library: (s) => <I s={s} d={<><path d="m16 6 4 14M12 6v14M8 8v12M4 4v16" /></>} />,
  sparkles: (s) => <I s={s} d={<><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" /></>} />,
  close: (s) => <I s={s} sw={2} d={<><path d="M18 6 6 18M6 6l12 12" /></>} />,
  clock: (s) => <I s={s} d={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>} />,
  file: (s) => <I s={s} d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>} />,
};

// small round glass icon button for the nav bar
function GlassIconButton({ children, onClick, badge }) {
  return (
    <button type="button" onClick={onClick} aria-label="Notifications"
      style={{
        position: "relative", width: 40, height: 40, borderRadius: 999, cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-secondary)",
        background: "linear-gradient(180deg, var(--glass-tint) 0%, transparent 60%), var(--glass-base)",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        backdropFilter: "blur(var(--glass-blur)) saturate(var(--glass-saturate))",
        border: "1px solid var(--glass-hairline)", boxShadow: "var(--glass-inner)",
      }}>
      {children}
      {badge ? (
        <span style={{ position: "absolute", top: 6, right: 7, width: 8, height: 8, borderRadius: 999,
          background: "var(--red)", boxShadow: "0 0 0 2px var(--surface-elevated)" }} />
      ) : null}
    </button>
  );
}

function SectionLabel({ children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1.4rem 2px 0.6rem" }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-muted)" }}>
        {children}
      </span>
      {right ? <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>{right}</span> : null}
    </div>
  );
}

// flat "free time" divider between blocks
function FreeGap({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.3rem 0.5rem", margin: "0.95rem 0" }}>
      <span style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
    </div>
  );
}

const NOW_TASK = {
  title: "Draft Chapter 3 — Methodology",
  course: "CS 198 · Thesis",
  timeLabel: "2:00 – 3:30 PM",
  timeLeft: "1h 12m left",
  progress: 0.32,
  reason: "Due Friday, and this is your only free 90-minute block today.",
};

const LATER = [
  { id: "r1", time: "3:30", endTime: "4:00", tone: "blue", course: "MATH 211", title: "Review series & sequences", meta: "quiz Thursday" },
  { id: "r2", time: "5:00", endTime: "6:00", tone: "green", course: "BIO 102", title: "Read Ch. 7 — Cellular Respiration", meta: "60 min" },
  { id: "r3", time: "7:30", endTime: "8:00", tone: "accent", course: "CS 198", title: "Office hours — thesis adviser", meta: "Zoom" },
];

const DONE = [
  { id: "d1", time: "9:00", tone: "green", course: "BIO 102", title: "Morning flashcard review" },
  { id: "d2", time: "11:00", tone: "amber", course: "MATH 211", title: "Stats problem set §4.2" },
];

// ---- Do Now bottom sheet (flat content over a dim scrim) ----
function DoNowSheet({ task, onClose }) {
  const [preset, setPreset] = React.useState("Study reviewer");
  const [type, setType] = React.useState("Outline + notes");
  const fieldStyle = {
    width: "100%", appearance: "none", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600,
    color: "var(--text-primary)", background: "var(--surface-soft)", border: "1px solid var(--border-strong)",
    borderRadius: "var(--radius-control)", padding: "0.6rem 0.75rem",
  };
  return (
    <div onClick={onClose}
      style={{ position: "absolute", inset: 0, zIndex: 80, display: "flex", alignItems: "flex-end",
        background: "rgba(31, 25, 19, 0.32)", WebkitBackdropFilter: "blur(2px)", backdropFilter: "blur(2px)",
        animation: "sfFade 220ms ease" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", background: "var(--surface-elevated)", borderTopLeftRadius: 24, borderTopRightRadius: 24,
          borderTop: "1px solid var(--border-subtle)", boxShadow: "0 -18px 40px rgba(28,22,14,0.18)",
          padding: "0.7rem 1.1rem calc(1.4rem + var(--app-safe-bottom))", animation: "sfSlideUp 280ms cubic-bezier(0.22,1,0.36,1)" }}>
        <div style={{ width: 38, height: 5, borderRadius: 999, background: "var(--border-hover)", margin: "0 auto 1rem" }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.6rem" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-muted)" }}>Generate output</div>
            <h2 style={{ margin: "0.3rem 0 0", fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>{task.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 999, border: "1px solid var(--border-strong)",
              background: "var(--surface-base)", color: "var(--text-secondary)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            {Icons.close(18)}
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.7rem" }}>
          <Chip tone="accent">{task.course}</Chip>
          <Chip tone="green">Grounded · 4 modules</Chip>
        </div>
        <p style={{ margin: "0.9rem 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>
          Pick a preset and output type. If readable source text is weak, Stay Focused generates a scaffold instead of inventing content.
        </p>
        <div style={{ display: "grid", gap: "0.7rem", marginTop: "0.9rem" }}>
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)" }}>Preset</span>
            <select value={preset} onChange={(e) => setPreset(e.target.value)} style={fieldStyle}>
              <option>Study reviewer</option><option>Quiz pack</option><option>Deep-learn notes</option><option>Draft answer</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)" }}>Output type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} style={fieldStyle}>
              <option>Outline + notes</option><option>Flashcards</option><option>Summary</option><option>Practice questions</option>
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: "0.55rem", marginTop: "1.1rem" }}>
          <Button variant="primary" size="lg" iconLeft={Icons.sparkles(18)} full onClick={onClose}>Generate output</Button>
        </div>
      </div>
    </div>
  );
}

// ---- placeholder tab content for non-Today tabs ----
function ComingSoon({ icon, label }) {
  return (
    <div style={{ display: "grid", placeItems: "center", height: "100%", padding: "2rem", textAlign: "center", gap: "0.6rem" }}>
      <span style={{ color: "var(--text-muted)" }}>{icon}</span>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 220 }}>This surface isn’t part of the Today demo — tap Today to return.</div>
    </div>
  );
}

function TodayScreen() {
  const [tab, setTab] = React.useState("today");
  const [sheet, setSheet] = React.useState(false);
  const logo = <img src="../../assets/logo-mark.svg" width="28" height="28" alt="" style={{ display: "block" }} />;

  return (
    <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", background: "var(--app-bg)" }}>
      <GlassNavBar
        subtitle="Tuesday · June 14"
        title="Today"
        large
        leading={logo}
        trailing={<GlassIconButton badge>{Icons.bell(20)}</GlassIconButton>}
        style={{ paddingTop: "56px" }}
      />

      {tab === "today" ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "0.4rem 1rem calc(150px + var(--app-safe-bottom))" }}>
          <NowHero {...NOW_TASK} startIcon={Icons.play(18)} onPrimary={() => setSheet(true)} />

          <div style={{ marginTop: "1.4rem" }}>
            <ScheduleGroup header="Later today" right="3 blocks">
              <ScheduleBlock {...LATER[0]} onClick={() => setSheet(true)} />
              <ScheduleBlock {...LATER[1]} onClick={() => setSheet(true)} />
              <ScheduleBlock {...LATER[2]} onClick={() => setSheet(true)} />
            </ScheduleGroup>
          </div>

          <FreeGap label="Free · 4:00 – 5:00 PM" />

          <div>
            <ScheduleGroup header="Earlier" right="2 done">
              {DONE.map((b) => (
                <ScheduleBlock key={b.id} {...b} state="done" />
              ))}
            </ScheduleGroup>
          </div>
        </div>
      ) : tab === "courses" ? (
        <ComingSoon icon={Icons.book(40)} label="Courses" />
      ) : (
        <ComingSoon icon={Icons.library(40)} label="Study Library" />
      )}

      <GlassFAB icon={Icons.sparkles(22)} label="Generate" onClick={() => setSheet(true)} style={{ bottom: "calc(96px + var(--app-safe-bottom))" }} />

      <GlassTabBar activeId={tab} onSelect={setTab} style={{ bottom: "calc(26px + var(--app-safe-bottom))" }}
        items={[
          { id: "today", label: "Today", icon: Icons.today(22) },
          { id: "courses", label: "Courses", icon: Icons.book(22) },
          { id: "library", label: "Library", icon: Icons.library(22) },
        ]} />

      {sheet ? <DoNowSheet task={NOW_TASK} onClose={() => setSheet(false)} /> : null}
    </div>
  );
}

window.TodayScreen = TodayScreen;
