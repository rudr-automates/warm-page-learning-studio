import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Flame, Clock, Target, LogOut, Settings2, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/site-header";
import { TasksPanel } from "@/components/dashboard/tasks-panel";
import { FocusTimer } from "@/components/dashboard/focus-timer";
import { CalendarPanel, eventsQuery } from "@/components/dashboard/calendar-panel";
import { computeStreak, dayKey } from "@/lib/streak";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Horizon 2.0" }, { name: "description", content: "Your learning workspace: tasks, calendar, focus and progress." }, { property: "og:title", content: "Dashboard — Horizon 2.0" }, { property: "og:description", content: "Your learning workspace." }] }),
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", context.user.id).maybeSingle();
    if (!data?.onboarding_completed) throw redirect({ to: "/onboarding" });
    return { profile: data };
  },
  component: Dashboard,
});

function Dashboard() {
  const { profile } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tz = profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data: sessions = [] } = useQuery({ queryKey: ["focus"], queryFn: async () => {
    const since = new Date(Date.now() - 60 * 86400_000).toISOString();
    const { data, error } = await supabase.from("focus_sessions").select("*").gte("started_at", since).order("started_at", { ascending: false });
    if (error) throw error;
    return data;
  } });
  const { data: events = [] } = useQuery(eventsQuery);

  const stats = useMemo(() => {
    const now = new Date();
    const streak = computeStreak(sessions.map((s) => new Date(s.started_at)), now, tz);
    const weekStart = Date.now() - 7 * 86400_000;
    const weekMin = Math.round(sessions.filter((s) => new Date(s.started_at).getTime() >= weekStart).reduce((a, s) => a + s.actual_seconds, 0) / 60);
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 86400_000);
      const k = dayKey(d, tz);
      return { k, label: d.toLocaleDateString(undefined, { weekday: "narrow", timeZone: tz }), min: Math.round(sessions.filter((s) => dayKey(new Date(s.started_at), tz) === k).reduce((a, s) => a + s.actual_seconds, 0) / 60) };
    });
    return { streak, weekMin, last7 };
  }, [sessions, tz]);

  const upcoming = events.filter((e) => new Date(e.ends_at) > new Date() && !e.completed).slice(0, 4);
  const max = Math.max(30, ...stats.last7.map((d) => d.min));
  const target = profile.weekly_target_minutes || 300;

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/sign-in", search: { redirect: undefined }, replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-paper">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" asChild><Link to="/onboarding"><Settings2 />Preferences</Link></Button>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut />Sign out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
            <h1 className="mt-2 text-4xl">Good to see you, {profile.display_name || "learner"}.</h1>
            {profile.main_objective && <p className="mt-1 text-muted-foreground">Focus: {profile.main_objective}{profile.target_date ? ` · target ${profile.target_date}` : ""}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild><a href="#focus">Start focus session</a></Button>
            <Button variant="outline" size="sm" asChild><a href="#tasks">Create task</a></Button>
            <Button variant="outline" size="sm" asChild><a href="#calendar">Plan study session</a></Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="paper-card p-5"><Flame className="text-primary" /><p className="mt-3 font-display text-4xl">{stats.streak}</p><p className="text-sm text-muted-foreground">day focus streak</p></div>
          <div className="paper-card p-5"><Clock className="text-forest" /><p className="mt-3 font-display text-4xl">{stats.weekMin}<span className="text-lg text-muted-foreground"> / {target} min</span></p><Progress value={Math.min(100, (stats.weekMin / target) * 100)} className="mt-2" /><p className="mt-1 text-sm text-muted-foreground">focus time, last 7 days</p></div>
          <div className="paper-card p-5">
            <p className="text-sm text-muted-foreground">Daily focus minutes</p>
            <div className="mt-3 flex h-20 items-end gap-2">
              {stats.last7.map((d) => (
                <div key={d.k} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-primary/80" style={{ height: `${(d.min / max) * 64}px` }} title={`${d.min} min`} />
                  <span className="text-[10px] text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <CalendarPanel />
            <TasksPanel />
          </div>
          <div className="space-y-6">
            <FocusTimer />
            <section className="paper-card p-5">
              <h2 className="text-2xl">Coming up</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {upcoming.length === 0 && <li className="text-muted-foreground">No upcoming sessions. Plan one on the calendar.</li>}
                {upcoming.map((e) => <li key={e.id} className="flex justify-between gap-2"><span className="truncate">{e.title}</span><span className="shrink-0 text-muted-foreground">{new Date(e.starts_at).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span></li>)}
              </ul>
            </section>
            <section className="paper-card p-5">
              <h2 className="text-2xl">Recent focus</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {sessions.length === 0 && <li className="text-muted-foreground">Your completed sessions will appear here.</li>}
                {sessions.slice(0, 5).map((s) => <li key={s.id} className="flex justify-between gap-2"><span className="truncate">{s.label || "Focus session"}{s.status === "cancelled" ? " (partial)" : ""}</span><span className="shrink-0 text-muted-foreground">{Math.round(s.actual_seconds / 60)} min</span></li>)}
              </ul>
            </section>
            <section className="paper-card border-dashed p-5">
              <BookOpen className="text-forest" />
              <h2 className="mt-2 text-xl">Courses & Learning Studio</h2>
              <p className="mt-1 text-sm text-muted-foreground">Course library, video lessons and your AI tutor are coming in the next phase.</p>
              <Target className="mt-3 size-4 text-primary" />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
