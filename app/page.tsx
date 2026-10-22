"use client";

import {
  Activity, ArrowDown, ArrowUpRight, BarChart3, Check, CheckCircle2, ChevronDown,
  Clock3, Dumbbell, Flame, Plus, Settings2, Sparkles, Target, Timer, Trash2,
  Utensils, X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Exercise = { id: string; name: string; muscle: string; sets: SetEntry[] };
type SetEntry = { id: string; weight: number; reps: number; done: boolean };
type WorkoutLog = { name: string; muscle: string; setNumber: number; weight: number; reps: number; at: string };
type NutritionLog = { calories: number; protein: number; carbs: number; fat: number; at: string };
type SavedState = {
  exercises: Exercise[];
  workoutLogs: WorkoutLog[];
  nutritionLogs: NutritionLog[];
  customExercises: { name: string; muscle: string }[];
  workoutName: string;
  workoutStartedAt?: string;
};
type NavKey = "home" | "workout" | "nutrition" | "progress";

const programs = [
  {
    name: "Full Body Beginner",
    subtitle: "3 days / week · 5 movements",
    exercises: [
      ["Goblet Squat", "Legs"], ["Dumbbell Bench Press", "Chest"], ["Lat Pulldown", "Back"],
      ["Dumbbell Romanian Deadlift", "Legs"], ["Plank", "Core"],
    ],
  },
  {
    name: "Push-Pull-Legs (PPL)",
    subtitle: "6 days / week · push day",
    exercises: [
      ["Barbell Bench Press", "Chest"], ["Overhead Press", "Shoulders"], ["Cable Tricep Pushdown", "Arms"],
      ["Dumbbell Lateral Raise", "Shoulders"], ["Incline Dumbbell Press", "Chest"],
    ],
  },
  {
    name: "Upper/Lower Split",
    subtitle: "4 days / week · upper day",
    exercises: [
      ["Barbell Bench Press", "Chest"], ["Seated Cable Row", "Back"], ["Overhead Press", "Shoulders"],
      ["Lat Pulldown", "Back"], ["Dumbbell Bicep Curl", "Arms"],
    ],
  },
] as const;

const timers = [30, 60, 90, 120];
const emptyState: SavedState = { exercises: [], workoutLogs: [], nutritionLogs: [], customExercises: [], workoutName: "Today's workout", workoutStartedAt: "" };
const storageKey = "selftrain-data-v1";

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function newSet(): SetEntry {
  return { id: makeId(), weight: 0, reps: 10, done: false };
}

function makeExercise(name: string, muscle: string, previous?: Pick<WorkoutLog, "weight" | "reps">): Exercise {
  const sets = [newSet(), newSet(), newSet()];
  if (previous) {
    for (const set of sets) {
      set.weight = previous.weight;
      set.reps = previous.reps;
    }
  }
  return { id: makeId(), name, muscle, sets };
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function ProgressBar({ value, max, color = "bg-emerald" }: { value: number; max: number; color?: string }) {
  const percent = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return <div className="progress-track"><div className={`progress-fill ${color}`} style={{ width: `${percent}%` }} /></div>;
}

export default function Home() {
  const [data, setData] = useState<SavedState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [nav, setNav] = useState<NavKey>("home");
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerPreset, setTimerPreset] = useState(60);
  const [exerciseName, setExerciseName] = useState("");
  const [muscle, setMuscle] = useState("Chest");
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [showNutritionForm, setShowNutritionForm] = useState(false);
  const [nutritionForm, setNutritionForm] = useState({ calories: "", protein: "", carbs: "", fat: "" });
  const [authUser, setAuthUser] = useState<{ id: string; email?: string } | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Saved on this device");

  const todayNutritionLogs = useMemo(() => {
    const today = new Date().toDateString();
    return data.nutritionLogs.filter((entry) => new Date(entry.at).toDateString() === today);
  }, [data.nutritionLogs]);
  const nutrition = useMemo(() => todayNutritionLogs.reduce(
    (totals, entry) => ({ calories: totals.calories + entry.calories, protein: totals.protein + entry.protein, carbs: totals.carbs + entry.carbs, fat: totals.fat + entry.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  ), [todayNutritionLogs]);
  const completedSets = data.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.done).length, 0);
  const totalSets = data.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setData({ ...emptyState, ...JSON.parse(saved) as Partial<SavedState> });
    } catch (error) {
      console.error("Could not load SelfTrain data from local storage.", error);
    }
    setHydrated(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setCloudReady(true);
      return;
    }
    void supabase.auth.getSession().then(({ data: sessionData, error }) => {
      if (error) {
        console.error("Could not read Supabase session.", error);
        setCloudReady(true);
        return;
      }
      if (sessionData.session?.user) {
        setAuthUser({ id: sessionData.session.user.id, email: sessionData.session.user.email });
      } else {
        setCloudReady(true);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
      setCloudReady(!session?.user);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUser) return;
    let current = true;
    const supabase = getSupabaseClient();
    if (!supabase) {
      setCloudReady(true);
      return;
    }
    void supabase.from("active_workouts").select("workout").eq("user_id", authUser.id).maybeSingle().then(({ data: remote, error }) => {
      if (!current) return;
      if (error) {
        console.error("Could not load active workout from Supabase.", error);
        setSyncMessage("Cloud load failed; using this device");
      } else if (remote?.workout && typeof remote.workout === "object") {
        setData({ ...emptyState, ...remote.workout as Partial<SavedState> });
      }
      setCloudReady(true);
    });
    return () => { current = false; };
  }, [authUser]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("Could not save SelfTrain data locally.", error);
      setSyncMessage("Local save failed");
    }
    if (!cloudReady) return;
    const supabase = getSupabaseClient();
    if (!supabase || !authUser) {
      setSyncMessage("Saved on this device");
      return;
    }
    void supabase.from("active_workouts").upsert(
      { user_id: authUser.id, workout: data, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    ).then(({ error }) => {
      if (error) {
        console.error("Could not sync active workout.", error);
        setSyncMessage("Cloud sync unavailable");
      } else {
        setSyncMessage("Synced to Supabase");
      }
    });
  }, [data, authUser, hydrated, cloudReady]);

  useEffect(() => {
    if (timerSeconds === null) return;
    if (timerSeconds <= 0) {
      setTimerSeconds(null);
      return;
    }
    const timeout = window.setTimeout(() => setTimerSeconds((seconds) => seconds === null ? null : seconds - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [timerSeconds]);

  function updateSet(exerciseId: string, setId: string, updates: Partial<SetEntry>) {
    setData((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) => exercise.id === exerciseId
        ? { ...exercise, sets: exercise.sets.map((set) => set.id === setId ? { ...set, ...updates } : set) }
        : exercise),
    }));
  }

  function addSet(exerciseId: string) {
    setData((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, sets: [...exercise.sets, newSet()] } : exercise),
    }));
  }

  function completeSet(exercise: Exercise, set: SetEntry) {
    const done = !set.done;
    updateSet(exercise.id, set.id, { done });
    if (!done) return;
    const record: WorkoutLog = { name: exercise.name, muscle: exercise.muscle, setNumber: exercise.sets.findIndex((item) => item.id === set.id) + 1, weight: set.weight, reps: set.reps, at: new Date().toISOString() };
    setData((current) => ({ ...current, workoutLogs: [record, ...current.workoutLogs].slice(0, 250) }));
    const supabase = getSupabaseClient();
    if (supabase && authUser) {
      void supabase.from("workout_logs").insert({ user_id: authUser.id, exercise_name: record.name, muscle_group: record.muscle, weight_kg: record.weight, reps: record.reps, set_number: record.setNumber, logged_at: record.at })
        .then(({ error }) => { if (error) console.error("Could not save workout log.", error); });
    }
    setTimerSeconds(timerPreset);
  }

  function loadProgram(index: number) {
    const program = programs[index];
    setData((current) => ({
      ...current,
      workoutName: program.name,
      workoutStartedAt: new Date().toISOString(),
      exercises: program.exercises.map(([name, group]) => {
        const previous = current.workoutLogs.find((log) => log.name === name);
        return makeExercise(name, group, previous);
      }),
    }));
    setNav("workout");
  }

  function addExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = exerciseName.trim();
    if (!name) return;
    setData((current) => ({
      ...current,
      exercises: [...current.exercises, makeExercise(name, muscle, current.workoutLogs.find((log) => log.name === name))],
      workoutStartedAt: current.workoutStartedAt || new Date().toISOString(),
      customExercises: current.customExercises.some((item) => item.name.toLowerCase() === name.toLowerCase())
        ? current.customExercises
        : [...current.customExercises, { name, muscle }],
    }));
    const supabase = getSupabaseClient();
    if (supabase && authUser) {
      void supabase.from("custom_exercises").insert({ user_id: authUser.id, name, muscle_group: muscle })
        .then(({ error }) => { if (error) console.error("Could not save custom exercise.", error); });
    }
    setExerciseName("");
    setShowExerciseForm(false);
  }

  function addNutrition(values: { calories: number; protein: number; carbs: number; fat: number }) {
    const entry: NutritionLog = { ...values, at: new Date().toISOString() };
    setData((current) => ({ ...current, nutritionLogs: [entry, ...current.nutritionLogs].slice(0, 250) }));
    const supabase = getSupabaseClient();
    if (supabase && authUser) {
      void supabase.from("nutrition_logs").insert({ user_id: authUser.id, calories: entry.calories, protein_g: entry.protein, carbs_g: entry.carbs, fat_g: entry.fat, logged_at: entry.at })
        .then(({ error }) => { if (error) console.error("Could not save nutrition log.", error); });
    }
  }

  function submitNutrition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addNutrition({
      calories: Number(nutritionForm.calories) || 0,
      protein: Number(nutritionForm.protein) || 0,
      carbs: Number(nutritionForm.carbs) || 0,
      fat: Number(nutritionForm.fat) || 0,
    });
    setNutritionForm({ calories: "", protein: "", carbs: "", fat: "" });
    setShowNutritionForm(false);
  }

  async function signIn() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSyncMessage("Add Supabase keys in .env.local to connect");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      console.error("Google sign-in failed.", error);
      setSyncMessage("Google sign-in failed");
    }
  }

  async function signOut() {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Could not sign out.", error);
      setSyncMessage("Sign out failed");
    }
  }

  const lastPerformance = (exerciseNameValue: string) => data.workoutLogs.find((log) =>
    log.name === exerciseNameValue && (!data.workoutStartedAt || log.at < data.workoutStartedAt),
  );
  const navigation: { key: NavKey; label: string; icon: typeof Activity }[] = [
    { key: "home", label: "Today", icon: Activity },
    { key: "workout", label: "Workout", icon: Dumbbell },
    { key: "nutrition", label: "Nutrition", icon: Utensils },
    { key: "progress", label: "Progress", icon: BarChart3 },
  ];

  return (
    <main className="app-shell">
      <aside className="desktop-sidebar">
        <a className="brand" href="#" onClick={() => setNav("home")}><span className="brand-mark"><Activity size={19} /></span>selftrain<span className="brand-dot">.</span></a>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setNav(key)} className={`nav-item ${nav === key ? "selected" : ""}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{key === "workout" && completedSets > 0 && <span className="nav-count">{completedSets}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><Sparkles size={17} /><div><strong>Small steps, big strength.</strong><p>Show up for yourself today.</p></div></div>
          <button className="nav-item settings-link" onClick={() => authUser ? void signOut() : void signIn()}><Settings2 size={18} /><span>{authUser ? "Sign out" : "Connect account"}</span></button>
        </div>
      </aside>

      <section className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><Activity size={18} /></span><span>selftrain<span className="brand-dot">.</span></span></div>
          <div className="topbar-date"><span className="online-dot" /> {new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</div>
          <button className="connect-button" onClick={() => authUser ? void signOut() : void signIn()}>
            {authUser ? <><CheckCircle2 size={15} /> Connected</> : <>Connect Google <ArrowUpRight size={15} /></>}
          </button>
        </header>

        <div className="content">
          {nav === "home" && (
            <>
              <section className="welcome-row">
                <div><span className="eyebrow">YOUR PERSONAL TRAINING SPACE</span><h1>Make today <span>count.</span></h1><p>A little progress is still progress. Let&apos;s get after it.</p></div>
                <div className="streak-card"><div className="streak-icon"><Flame size={18} /></div><div><strong>Keep your streak</strong><span>One session at a time</span></div><ArrowUpRight size={16} className="streak-arrow" /></div>
              </section>

              <section className="stats-grid">
                <div className="stat-card"><div className="stat-label"><span>WORKOUT</span><Dumbbell size={17} /></div><strong>{completedSets}<small> / {totalSets}</small></strong><p>sets completed today</p><ProgressBar value={completedSets} max={totalSets} /></div>
                <div className="stat-card"><div className="stat-label"><span>CALORIES</span><Flame size={17} /></div><strong>{nutrition.calories.toLocaleString()}<small> kcal</small></strong><p>of 2,000 kcal daily goal</p><ProgressBar value={nutrition.calories} max={2000} color="bg-orange" /></div>
                <div className="stat-card"><div className="stat-label"><span>PROTEIN</span><Target size={17} /></div><strong>{nutrition.protein}<small> / 120 g</small></strong><p>fuel your recovery</p><ProgressBar value={nutrition.protein} max={120} color="bg-blue" /></div>
              </section>

              <section className="section-block">
                <div className="section-heading"><div><span className="eyebrow">GET STARTED</span><h2>Choose your program</h2></div><span className="section-note">Built for real life</span></div>
                <div className="program-grid">
                  {programs.map((program, index) => (
                    <button className="program-card" key={program.name} onClick={() => loadProgram(index)}>
                      <div className={`program-art art-${index}`}><Dumbbell size={22} /><span>0{index + 1}</span></div>
                      <div className="program-copy"><span className="program-tag">{index === 0 ? "STARTER" : index === 1 ? "POPULAR" : "FLEXIBLE"}</span><h3>{program.name}</h3><p>{program.subtitle}</p></div>
                      <span className="program-action"><ArrowUpRight size={16} /></span>
                    </button>
                  ))}
                </div>
              </section>

              <div className="dashboard-columns">
                <section className="panel today-panel">
                  <div className="panel-heading"><div><span className="eyebrow">IN PROGRESS</span><h2>{data.workoutName}</h2></div><button className="text-button" onClick={() => setNav("workout")}>Open workout <ArrowUpRight size={14} /></button></div>
                  {data.exercises.length ? <div className="mini-exercise-list">{data.exercises.slice(0, 3).map((exercise) => (
                    <div className="mini-exercise" key={exercise.id}><span className="mini-icon"><Dumbbell size={15} /></span><span className="mini-name">{exercise.name}<small>{exercise.muscle}</small></span><span className="mini-progress">{exercise.sets.filter((set) => set.done).length}/{exercise.sets.length} sets</span></div>
                  ))}</div> : <div className="empty-inline"><span className="empty-icon"><Dumbbell size={18} /></span><span>Your workout is waiting.<small>Choose a program to get moving.</small></span></div>}
                </section>

                <section className="panel nutrition-panel">
                  <div className="panel-heading"><div><span className="eyebrow">DAILY FUEL</span><h2>Nutrition</h2></div><button className="icon-button" aria-label="Log food" onClick={() => setShowNutritionForm(true)}><Plus size={18} /></button></div>
                  <div className="nutrition-summary"><span className="calorie-ring"><Flame size={18} /></span><div><strong>{nutrition.calories.toLocaleString()} <small>kcal</small></strong><span>of 2,000 daily goal</span></div></div>
                  <div className="macro-row"><div className="macro-label"><span>Protein</span><strong>{nutrition.protein}<small> / 120g</small></strong></div><ProgressBar value={nutrition.protein} max={120} color="bg-emerald" /></div>
                  <div className="macro-row"><div className="macro-label"><span>Carbs</span><strong>{nutrition.carbs}<small> / 250g</small></strong></div><ProgressBar value={nutrition.carbs} max={250} color="bg-purple" /></div>
                  <button className="quick-add-button" onClick={() => setNav("nutrition")}><Plus size={16} /> Quick add food</button>
                </section>
              </div>
              <footer className="footer-note"><span>Made for your own pace.</span><span>{syncMessage}</span></footer>
            </>
          )}

          {nav === "workout" && (
            <>
              <section className="page-intro">
                <span className="eyebrow">TRAINING LOG</span><h1>{data.workoutName}</h1><p>Every rep counts. Record your work and keep getting stronger.</p>
                <div className="workout-progress"><span><CheckCircle2 size={15} /> {completedSets} of {totalSets} sets done</span><ProgressBar value={completedSets} max={totalSets} /></div>
              </section>
              <div className="workout-toolbar">
                <div className="toolbar-select"><Dumbbell size={15} /><span>{data.exercises.length} exercises</span><ChevronDown size={14} /></div>
                <button className="primary-button" onClick={() => setShowExerciseForm(true)}><Plus size={16} /> Add exercise</button>
              </div>
              {!data.exercises.length && <div className="empty-state panel"><span className="empty-icon large"><Dumbbell size={24} /></span><h2>Start with a program</h2><p>Load a ready-made workout or add your own exercises.</p><button className="primary-button" onClick={() => setNav("home")}>Browse programs <ArrowUpRight size={15} /></button></div>}
              <div className="exercise-list">
                {data.exercises.map((exercise, exerciseIndex) => {
                  const previous = lastPerformance(exercise.name);
                  return <article className="exercise-card panel" key={exercise.id}>
                    <div className="exercise-card-head"><span className="exercise-index">{String(exerciseIndex + 1).padStart(2, "0")}</span><div className="exercise-title"><h2>{exercise.name}</h2><span>{exercise.muscle}</span></div>
                      {previous && <span className="last-performance"><span>LAST PERFORMANCE</span>{previous.weight} kg × {previous.reps} reps</span>}
                      <button className="icon-button remove-button" aria-label={`Remove ${exercise.name}`} onClick={() => setData((current) => ({ ...current, exercises: current.exercises.filter((item) => item.id !== exercise.id) }))}><Trash2 size={16} /></button>
                    </div>
                    <div className="set-head"><span>SET</span><span>WEIGHT <small>kg</small></span><span>REPS</span><span>DONE</span></div>
                    <div className="set-list">{exercise.sets.map((set, setIndex) => <div className={`set-row ${set.done ? "set-complete" : ""}`} key={set.id}>
                      <span className="set-number">{String(setIndex + 1).padStart(2, "0")}</span>
                      <label className="number-field"><input aria-label={`${exercise.name} set ${setIndex + 1} weight in kg`} inputMode="decimal" type="number" min="0" step="0.5" value={set.weight} onChange={(event) => updateSet(exercise.id, set.id, { weight: Number(event.target.value) })} /></label>
                      <label className="number-field"><input aria-label={`${exercise.name} set ${setIndex + 1} reps`} inputMode="numeric" type="number" min="0" step="1" value={set.reps} onChange={(event) => updateSet(exercise.id, set.id, { reps: Number(event.target.value) })} /></label>
                      <button aria-label={set.done ? "Mark set incomplete" : "Complete set"} className={`check-button ${set.done ? "checked" : ""}`} onClick={() => completeSet(exercise, set)}>{set.done && <Check size={15} />}</button>
                    </div>)}</div>
                    <div className="exercise-card-foot"><button className="add-set-button" onClick={() => addSet(exercise.id)}><Plus size={14} /> Add set</button><span>{exercise.sets.filter((set) => set.done).length} / {exercise.sets.length} complete</span></div>
                  </article>;
                })}
              </div>
              <section className="rest-controls panel"><div className="rest-copy"><span className="rest-icon"><Timer size={18} /></span><div><strong>Rest timer</strong><span>Starts automatically when you finish a set</span></div></div><div className="timer-presets">{timers.map((seconds) => <button key={seconds} className={timerPreset === seconds ? "active" : ""} onClick={() => setTimerPreset(seconds)}>{seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}</button>)}</div></section>
              <footer className="footer-note"><span>Consistency over perfection.</span><span>{syncMessage}</span></footer>
            </>
          )}

          {nav === "nutrition" && (
            <>
              <section className="page-intro"><span className="eyebrow">DAILY NUTRITION</span><h1>Fuel your <span>progress.</span></h1><p>Simple tracking to support the work you put in.</p></section>
              <div className="nutrition-page-grid">
                <section className="panel nutrition-goals">
                  <div className="panel-heading"><div><span className="eyebrow">TODAY&apos;S INTAKE</span><h2>Daily overview</h2></div><span className="date-pill">Today</span></div>
                  <div className="calorie-large"><div className="calorie-ring big"><Flame size={21} /></div><div><strong>{nutrition.calories.toLocaleString()}</strong><span>kcal consumed <i>/ 2,000 kcal</i></span></div></div>
                  <ProgressBar value={nutrition.calories} max={2000} color="bg-orange" />
                  <div className="macro-overview">
                    {[{ name: "Protein", value: nutrition.protein, goal: 120, color: "bg-emerald", unit: "g" }, { name: "Carbs", value: nutrition.carbs, goal: 250, color: "bg-purple", unit: "g" }, { name: "Fat", value: nutrition.fat, goal: 70, color: "bg-blue", unit: "g" }].map((macro) => <div className="macro-card" key={macro.name}><div><span>{macro.name}</span><strong>{macro.value}<small> / {macro.goal}{macro.unit}</small></strong></div><ProgressBar value={macro.value} max={macro.goal} color={macro.color} /></div>)}
                  </div>
                </section>
                <section className="panel quick-add-panel">
                  <div className="panel-heading"><div><span className="eyebrow">LOW FRICTION</span><h2>Quick add</h2></div><span className="sparkle-badge"><Sparkles size={15} /></span></div>
                  <p>Tap a preset to log it instantly.</p>
                  <button className="preset-button calorie-preset" onClick={() => addNutrition({ calories: 250, protein: 0, carbs: 0, fat: 0 })}><span className="preset-symbol"><Flame size={18} /></span><span><strong>+250 kcal</strong><small>Quick calorie add</small></span><Plus size={17} /></button>
                  <button className="preset-button protein-preset" onClick={() => addNutrition({ calories: 0, protein: 25, carbs: 0, fat: 0 })}><span className="preset-symbol"><Target size={18} /></span><span><strong>+25g protein</strong><small>Protein shake / snack</small></span><Plus size={17} /></button>
                  <button className="secondary-button full-button" onClick={() => setShowNutritionForm(true)}><Plus size={16} /> Log meal details</button>
                </section>
              </div>
              <section className="panel log-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR ENTRIES</span><h2>Today&apos;s food log</h2></div><span className="log-count">{data.nutritionLogs.length} entries</span></div>
                {todayNutritionLogs.length ? <div className="food-log-list">{todayNutritionLogs.map((entry, index) => <div className="food-log-entry" key={`${entry.at}-${index}`}><span className="food-log-icon"><Utensils size={16} /></span><span className="food-log-desc">{entry.calories ? "Food / quick add" : "Protein quick add"}<small>{new Date(entry.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {entry.protein}g protein · {entry.carbs}g carbs · {entry.fat}g fat</small></span><strong>{entry.calories} <small>kcal</small></strong></div>)}</div> : <div className="empty-inline"><span className="empty-icon"><Utensils size={17} /></span><span>No food logged yet.<small>Use a quick add to get started.</small></span></div>}
              </section>
              <footer className="footer-note"><span>Fuel well. Feel good.</span><span>{syncMessage}</span></footer>
            </>
          )}

          {nav === "progress" && (
            <>
              <section className="page-intro"><span className="eyebrow">YOUR JOURNEY</span><h1>Progress, <span>in motion.</span></h1><p>Every logged set is proof you showed up.</p></section>
              <section className="stats-grid progress-stats">
                <div className="stat-card"><div className="stat-label"><span>TOTAL WORKOUT SETS</span><Dumbbell size={17} /></div><strong>{data.workoutLogs.length}</strong><p>sets recorded all-time</p></div>
                <div className="stat-card"><div className="stat-label"><span>CALORIES LOGGED</span><Flame size={17} /></div><strong>{data.nutritionLogs.reduce((total, entry) => total + entry.calories, 0).toLocaleString()}</strong><p>kcal in your food log</p></div>
                <div className="stat-card"><div className="stat-label"><span>EXERCISES</span><Activity size={17} /></div><strong>{new Set(data.workoutLogs.map((log) => log.name)).size}</strong><p>unique movements trained</p></div>
              </section>
              <section className="panel log-panel"><div className="panel-heading"><div><span className="eyebrow">RECENT TRAINING</span><h2>Workout history</h2></div><span className="log-count">{data.workoutLogs.length} sets</span></div>
                {data.workoutLogs.length ? <div className="food-log-list">{data.workoutLogs.slice(0, 20).map((log, index) => <div className="food-log-entry" key={`${log.at}-${index}`}><span className="food-log-icon workout-log-icon"><Dumbbell size={16} /></span><span className="food-log-desc">{log.name}<small>{log.muscle} · Set {log.setNumber} · {new Date(log.at).toLocaleDateString()}</small></span><strong>{log.weight} <small>kg × {log.reps}</small></strong></div>)}</div> : <div className="empty-inline"><span className="empty-icon"><BarChart3 size={17} /></span><span>Nothing logged yet.<small>Complete a set to start your history.</small></span></div>}
              </section>
              <footer className="footer-note"><span>Built one day at a time.</span><span>{syncMessage}</span></footer>
            </>
          )}
        </div>
      </section>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setNav(key)} className={nav === key ? "active" : ""}><Icon size={19} strokeWidth={1.9} /><span>{label}</span></button>)}
      </nav>

      {showExerciseForm && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowExerciseForm(false); }}><section className="modal panel" role="dialog" aria-modal="true" aria-labelledby="exercise-modal-title"><button className="modal-close" aria-label="Close" onClick={() => setShowExerciseForm(false)}><X size={19} /></button><span className="eyebrow">MAKE IT YOURS</span><h2 id="exercise-modal-title">Add an exercise</h2><p>Build your session around what works for you.</p><form onSubmit={addExercise}><label className="form-label">Exercise name<input autoFocus required maxLength={60} placeholder="e.g. Dumbbell shoulder press" value={exerciseName} onChange={(event) => setExerciseName(event.target.value)} /></label><label className="form-label">Muscle group<select value={muscle} onChange={(event) => setMuscle(event.target.value)}>{["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full body", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label><button className="primary-button full-button" type="submit"><Plus size={16} /> Add to workout</button></form></section></div>}

      {showNutritionForm && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNutritionForm(false); }}><section className="modal panel" role="dialog" aria-modal="true" aria-labelledby="nutrition-modal-title"><button className="modal-close" aria-label="Close" onClick={() => setShowNutritionForm(false)}><X size={19} /></button><span className="eyebrow">DAILY FUEL</span><h2 id="nutrition-modal-title">Log nutrition</h2><p>Add your meal totals. You can leave any macro blank.</p><form onSubmit={submitNutrition}><div className="nutrition-form-grid"><label className="form-label">Calories<input type="number" min="0" max="10000" placeholder="0" value={nutritionForm.calories} onChange={(event) => setNutritionForm({ ...nutritionForm, calories: event.target.value })} /></label><label className="form-label">Protein (g)<input type="number" min="0" max="1000" placeholder="0" value={nutritionForm.protein} onChange={(event) => setNutritionForm({ ...nutritionForm, protein: event.target.value })} /></label><label className="form-label">Carbs (g)<input type="number" min="0" max="1000" placeholder="0" value={nutritionForm.carbs} onChange={(event) => setNutritionForm({ ...nutritionForm, carbs: event.target.value })} /></label><label className="form-label">Fat (g)<input type="number" min="0" max="1000" placeholder="0" value={nutritionForm.fat} onChange={(event) => setNutritionForm({ ...nutritionForm, fat: event.target.value })} /></label></div><button className="primary-button full-button" type="submit"><Check size={16} /> Save food log</button></form></section></div>}

      {timerSeconds !== null && <div className="timer-overlay" role="dialog" aria-modal="true" aria-label="Rest timer"><div className="timer-card panel"><button className="timer-dismiss" aria-label="Dismiss rest timer" onClick={() => setTimerSeconds(null)}><X size={19} /></button><span className="timer-icon"><Timer size={22} /></span><span className="eyebrow">REST & RECOVER</span><strong className="timer-countdown">{formatTime(timerSeconds)}</strong><p>Take a breath. You&apos;ve earned it.</p><div className="timer-progress"><span style={{ width: `${Math.max(0, Math.min(100, (timerSeconds / timerPreset) * 100))}%` }} /></div><button className="secondary-button full-button" onClick={() => setTimerSeconds(null)}>Skip rest <ArrowDown size={15} /></button></div></div>}
    </main>
  );
}
