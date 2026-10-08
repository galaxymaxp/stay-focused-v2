"use client";
import type { ActivitySummary } from "@stay-focused/shared";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  WEEKDAY_LETTERS,
  addDays,
  groupByDueDay,
  monthWeeks,
  sameMonth,
  shiftMonth,
  startOfDay,
  weekDays,
  weekLabel,
} from "../../app-model/calendarPresentation";
import { courseIdentity } from "../../app-model/courseIdentity";
import { localDate, timeLabel } from "../../app-model/presentation";
import { CourseDot, CourseMark } from "../../components/course";
import { Icon } from "../../components/ui";

// Web port of apps/mobile/src/features/redesign/TodayCalendar.tsx.

const MAX_DOTS = 3;
const DAY_MS = 86_400_000;
const finished = (item: ActivitySummary) =>
  item.status === "submitted" || item.status === "completed";

/**
 * In the spirit of Canvas's To Do: a week strip (or the whole month) with a
 * dot per item due in its course's color, and the selected day's work below.
 */
export function TodayCalendar({ items }: { items: readonly ActivitySummary[] }) {
  const today = startOfDay(new Date());
  const [selected, setSelected] = useState(() => localDate(today));
  const [anchor, setAnchor] = useState(today);
  const [month, setMonth] = useState(false);
  const byDay = useMemo(() => groupByDueDay(items), [items]);
  const move = (direction: 1 | -1) =>
    setAnchor((value) =>
      month ? shiftMonth(value, direction) : addDays(value, direction * 7),
    );
  const pick = (day: Date) => {
    setSelected(localDate(day));
    if (month && !sameMonth(day, anchor))
      setAnchor(new Date(day.getFullYear(), day.getMonth(), 1));
  };
  const rows = month ? monthWeeks(anchor) : [weekDays(anchor)];
  const title = month
    ? anchor.toLocaleDateString([], { month: "long", year: "numeric" })
    : weekLabel(anchor, today);
  const showingToday = month
    ? sameMonth(anchor, today)
    : weekDays(anchor).some((day) => day.getTime() === today.getTime());
  const selectedDate = new Date(`${selected}T00:00:00`);
  const due = byDay.get(selected) ?? [];
  const dayTitle =
    selected === localDate(today)
      ? "Today"
      : selected === localDate(addDays(today, 1))
        ? "Tomorrow"
        : selectedDate.toLocaleDateString([], {
            weekday: "long",
            month: "short",
            day: "numeric",
          });

  return (
    <section className="stack today-calendar">
      <div className="row between">
        <h2>Calendar</h2>
        <div className="row">
          {!showingToday && (
            <button
              className="subtle"
              onClick={() => {
                setAnchor(today);
                setSelected(localDate(today));
              }}
            >
              Today
            </button>
          )}
          <button
            className={month ? "chip-toggle on" : "chip-toggle"}
            aria-pressed={month}
            onClick={() => {
              setMonth((value) => !value);
              setAnchor(
                month
                  ? selectedDate
                  : new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
              );
            }}
          >
            <Icon name="calendar" />
            Month
          </button>
        </div>
      </div>
      <div className="surface calendar-card">
        <div className="row between calendar-nav">
          <button
            className="icon-button subtle"
            aria-label={month ? "Previous month" : "Previous week"}
            onClick={() => move(-1)}
          >
            <Icon name="chevron-left" />
          </button>
          <strong>{title}</strong>
          <button
            className="icon-button subtle"
            aria-label={month ? "Next month" : "Next week"}
            onClick={() => move(1)}
          >
            <Icon name="chevron-right" />
          </button>
        </div>
        <div className="calendar-grid" role="grid" key={`${month}-${localDate(anchor)}`}>
          {WEEKDAY_LETTERS.map((letter, i) => (
            <span key={i} className="calendar-weekday" aria-hidden="true">
              {letter}
            </span>
          ))}
          {rows.flat().map((day) => {
            const key = localDate(day);
            const list = byDay.get(key) ?? [];
            const isToday = day.getTime() === today.getTime();
            const outside = month && !sameMonth(day, anchor);
            return (
              <button
                key={key}
                className={[
                  "calendar-day-cell",
                  key === selected ? "selected" : "",
                  isToday ? "today" : "",
                  outside ? "outside" : "",
                  day.getTime() < today.getTime() ? "past" : "",
                ].join(" ")}
                aria-pressed={key === selected}
                aria-label={`${day.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}${isToday ? ", today" : ""}, ${list.length ? `${list.length} due` : "nothing due"}`}
                onClick={() => pick(day)}
              >
                <span className="calendar-date">{day.getDate()}</span>
                <span className="calendar-dots">
                  {list.slice(0, MAX_DOTS).map((item) => (
                    <CourseDot key={item.id} course={item.course} faded={finished(item)} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <div className="calendar-agenda" key={selected}>
          <div className="row between">
            <h3>{dayTitle}</h3>
            <span className="meta">{due.length ? `${due.length} due` : ""}</span>
          </div>
          {due.length === 0 ? (
            <p className="muted">Nothing due.</p>
          ) : (
            due.map((item) => <AgendaRow key={item.id} item={item} />)
          )}
        </div>
      </div>
    </section>
  );
}

function AgendaRow({ item }: { item: ActivitySummary }) {
  const identity = item.course ? courseIdentity(item.course) : null;
  const done = finished(item);
  const overdue = !done && !!item.dueAt && Date.parse(item.dueAt) < Date.now();
  const soon = !done && !!item.dueAt && Date.parse(item.dueAt) - Date.now() < DAY_MS;
  return (
    <Link
      className="agenda-row"
      href={`/tasks/${encodeURIComponent(item.id)}`}
      aria-label={`${item.title}, ${identity?.title ?? "Personal"}, due ${timeLabel(item.dueAt)}${done ? ", submitted" : ""}`}
    >
      {item.course ? <CourseMark course={item.course} identity={identity!} size={32} /> : <span className="agenda-blank" />}
      <span className="grow">
        <strong className={done ? "done" : undefined}>{item.title}</strong>
        <span className={`meta${overdue || soon ? " urgent" : ""}`}>
          {[
            overdue ? "Past due" : done ? (item.status === "submitted" ? "Submitted" : "Done") : `Due ${timeLabel(item.dueAt)}`,
            identity?.title ?? "Personal",
          ].join(" · ")}
        </span>
      </span>
      {done && <Icon name="circle-check" />}
    </Link>
  );
}
