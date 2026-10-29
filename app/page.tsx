"use client";

import {
  Activity, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Check, CheckCircle2, ChevronDown,
  Clock3, Dumbbell, Flame, Pause, Play, Plus, RotateCcw, Settings2, Sparkles, Target, Timer, Trash2,
  Utensils, Video, X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formGuideVideos } from "@/lib/form-guide";
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
  workoutDays: string[];
  streakDays: string[];
  streakPopupDate: string;
  timerPreset: number;
  stopwatchElapsed: number;
  stopwatchStartedAt: string;
};
type NavKey = "home" | "workout" | "nutrition" | "progress";
type Language = "id" | "en";

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
  {
    name: "Full Body Calisthenics (No Equipment)",
    subtitle: "3 days / week · 7 bodyweight movements",
    exercises: [
      ["Push-Ups", "Calisthenics / Bodyweight"], ["Pull-Ups", "Calisthenics / Bodyweight"],
      ["Dips", "Calisthenics / Bodyweight"], ["Australian Pull-Ups", "Calisthenics / Bodyweight"],
      ["Bodyweight Squats", "Calisthenics / Bodyweight"], ["Pike Push-Ups", "Calisthenics / Bodyweight"],
      ["Planks", "Calisthenics / Bodyweight"],
    ],
  },
] as const;

const timers = [30, 60, 90, 120];
const bodyweightNames = new Set(["push-ups", "push up", "push-ups", "pull-ups", "pull up", "dips", "australian pull-ups", "bodyweight squats", "pike push-ups", "planks"]);
const bodyweightExercises = ["Push-Ups", "Pull-Ups", "Dips", "Australian Pull-Ups", "Bodyweight Squats", "Pike Push-Ups", "Planks"];
const formGuides: Record<string, { id: string[]; en: string[] }> = {
  "goblet squat": {
    id: ["Pegang beban dekat dada dan kencangkan otot inti.", "Jaga tumit tetap menapak dan lutut searah jari kaki.", "Turun dengan terkendali, lalu dorong seluruh telapak kaki untuk berdiri."],
    en: ["Hold the weight close to your chest and brace your core.", "Keep your heels planted and knees tracking in line with your toes.", "Lower under control, then drive through the whole foot to stand."],
  },
  "dumbbell bench press": {
    id: ["Tarik tulang belikat ke bawah dan ke belakang sebelum mendorong.", "Jaga pergelangan tangan sejajar dengan siku dan turunkan beban dengan terkendali.", "Dorong ke atas tanpa membenturkan dumbbell."],
    en: ["Set your shoulder blades down and back before you press.", "Keep wrists stacked over elbows and lower the weights with control.", "Press up without letting the dumbbells collide overhead."],
  },
  "push-ups": {
    id: ["Jaga tubuh lurus dari kepala hingga tumit dan kencangkan bokong.", "Letakkan tangan sedikit lebih lebar dari bahu; jaga siku pada sudut yang nyaman.", "Turunkan dada di antara kedua tangan, lalu dorong lantai menjauh."],
    en: ["Keep a straight line from head to heels and brace your glutes.", "Place hands just outside shoulder width; keep elbows at a comfortable angle.", "Lower your chest between your hands, then press the floor away."],
  },
  "push up": {
    id: ["Jaga tubuh lurus dari kepala hingga tumit dan kencangkan bokong.", "Letakkan tangan sedikit lebih lebar dari bahu; jaga siku pada sudut yang nyaman.", "Turunkan dada di antara kedua tangan, lalu dorong lantai menjauh."],
    en: ["Keep a straight line from head to heels and brace your glutes.", "Place hands just outside shoulder width; keep elbows at a comfortable angle.", "Lower your chest between your hands, then press the floor away."],
  },
  "pull-ups": {
    id: ["Mulai dari posisi menggantung dengan bahu tetap aktif.", "Tarik siku ke arah rusuk tanpa mengayunkan kaki.", "Turun perlahan hingga posisi menggantung yang nyaman."],
    en: ["Start from a controlled hang with shoulders engaged.", "Drive elbows down toward your ribs without swinging your legs.", "Lower to a comfortable full hang with control."],
  },
  "pull ups": {
    id: ["Mulai dari posisi menggantung dengan bahu tetap aktif.", "Tarik siku ke arah rusuk tanpa mengayunkan kaki.", "Turun perlahan hingga posisi menggantung yang nyaman."],
    en: ["Start from a controlled hang with shoulders engaged.", "Drive elbows down toward your ribs without swinging your legs.", "Lower to a comfortable full hang with control."],
  },
  dips: {
    id: ["Jaga bahu tetap rendah dan dada terangkat pada palang yang stabil.", "Tekuk siku dan turun hanya sejauh bahu terasa nyaman.", "Dorong melalui telapak tangan untuk kembali tanpa mengangkat bahu."],
    en: ["Keep shoulders down and chest lifted on stable bars.", "Bend your elbows and lower only as far as your shoulders feel comfortable.", "Press through your palms to return without shrugging."],
  },
  "australian pull-ups": {
    id: ["Pastikan palang terpasang aman setinggi pinggang dan tubuh tetap lurus.", "Tarik dada ke arah palang dengan menggerakkan siku ke belakang.", "Turun perlahan tanpa membiarkan pinggul melorot."],
    en: ["Set a secure bar around waist height and keep your body straight.", "Pull your chest toward the bar by driving elbows back.", "Lower slowly while keeping your hips from sagging."],
  },
  "bodyweight squats": {
    id: ["Berdiri dengan kaki selebar bahu dan telapak kaki menapak.", "Turunkan pinggul di antara kedua kaki dengan lutut searah jari kaki.", "Berdiri tegak dengan mendorong lantai; jangan memantul di posisi bawah."],
    en: ["Stand about shoulder-width with feet planted.", "Sit between your hips while knees follow your toes.", "Stand tall by pushing the floor away; avoid bouncing at the bottom."],
  },
  "pike push-ups": {
    id: ["Mulai dalam posisi V terbalik, pinggul tinggi dan tangan selebar bahu.", "Tekuk siku untuk menurunkan puncak kepala ke arah lantai.", "Dorong lantai menjauh sambil menjaga pinggul tetap tinggi."],
    en: ["Start in an inverted V with hips high and hands shoulder-width.", "Bend elbows to lower the crown of your head toward the floor.", "Press the floor away while keeping your hips stacked high."],
  },
  planks: {
    id: ["Posisikan siku tepat di bawah bahu dan jaga tubuh tetap lurus.", "Kencangkan perut dan bokong tanpa menahan napas.", "Akhiri set saat pinggul mulai turun atau terangkat."],
    en: ["Stack elbows under shoulders and keep your body in one line.", "Brace your abdomen and squeeze glutes without holding your breath.", "Stop the set when your hips begin to sag or pike."],
  },
};
const languageStorageKey = "selftrain-language-v1";
const emptyState: SavedState = {
  exercises: [], workoutLogs: [], nutritionLogs: [], customExercises: [], workoutName: "Today's workout", workoutStartedAt: "",
  workoutDays: [], streakDays: [], streakPopupDate: "", timerPreset: 60, stopwatchElapsed: 0, stopwatchStartedAt: "",
};
const storageKey = "selftrain-data-v1";

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isBodyweight(exercise: Pick<Exercise, "name" | "muscle">) {
  return exercise.muscle === "Calisthenics / Bodyweight" || bodyweightNames.has(exercise.name.toLowerCase());
}

function localizedMuscle(muscle: string, language: Language) {
  if (language === "en") return muscle;
  const labels: Record<string, string> = {
    Chest: "Dada", Back: "Punggung", Legs: "Kaki", Shoulders: "Bahu", Arms: "Lengan",
    Core: "Otot inti", "Full body": "Seluruh tubuh", "Calisthenics / Bodyweight": "Kalistenik / Berat badan",
    Other: "Lainnya",
  };
  return labels[muscle] || muscle;
}

function localizedWorkoutName(name: string, language: Language) {
  if (language === "en") return name;
  const labels: Record<string, string> = {
    "Today's workout": "Latihan hari ini",
    "Full Body Beginner": "Latihan Seluruh Tubuh Pemula",
    "Push-Pull-Legs (PPL)": "Push-Pull-Legs (PPL)",
    "Upper/Lower Split": "Split Tubuh Atas/Bawah",
    "Full Body Calisthenics (No Equipment)": "Kalistenik Seluruh Tubuh (Tanpa Alat)",
  };
  return labels[name] || name;
}

function localizedSyncMessage(message: string, language: Language) {
  if (language === "en") return message;
  const labels: Record<string, string> = {
    "Saved on this device": "Tersimpan di perangkat ini",
    "Cloud load failed; using this device": "Gagal memuat cloud; menggunakan perangkat ini",
    "Local save failed": "Gagal menyimpan secara lokal",
    "Cloud sync unavailable": "Sinkronisasi cloud tidak tersedia",
    "Synced to Supabase": "Tersinkron ke Supabase",
    "Add Supabase keys in .env.local to connect": "Tambahkan kunci Supabase di .env.local untuk menghubungkan",
    "Google sign-in failed": "Gagal masuk dengan Google",
    "Sign out failed": "Gagal keluar",
  };
  return labels[message] || message;
}

function calculateStreak(days: string[], today: string) {
  const recorded = new Set(days);
  const cursor = new Date(`${today}T12:00:00`);
  let count = 0;
  while (recorded.has(localDateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function calendarMonthLabel(date: Date, language: Language) {
  return date.toLocaleDateString(language === "id" ? "id-ID" : "en-US", { month: "long", year: "numeric" });
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

function ActivityCalendar({ month, workoutDays, streakDays, onMonthChange, language }: {
  month: Date;
  workoutDays: string[];
  streakDays: string[];
  onMonthChange: (direction: number) => void;
  language: Language;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const today = localDateKey(new Date());
  const workoutSet = new Set(workoutDays);
  const streakSet = new Set(streakDays);
  const cells = Array.from({ length: firstWeekday + dayCount }, (_, index) => {
    if (index < firstWeekday) return null;
    const day = index - firstWeekday + 1;
    return { day, key: localDateKey(new Date(year, monthIndex, day)) };
  });
  return (
    <section className="panel streak-calendar">
      <div className="panel-heading">
        <div><span className="eyebrow">{language === "id" ? "KONSISTENSI MEMBAWA HASIL" : "SHOWING UP ADDS UP"}</span><h2>{language === "id" ? "Kalender aktivitas" : "Activity calendar"}</h2></div>
        <div className="calendar-month-nav">
          <button aria-label={language === "id" ? "Bulan sebelumnya" : "Previous month"} onClick={() => onMonthChange(-1)}><ArrowLeft size={14} /></button>
          <strong>{calendarMonthLabel(month, language)}</strong>
          <button aria-label={language === "id" ? "Bulan berikutnya" : "Next month"} onClick={() => onMonthChange(1)}><ArrowRight size={14} /></button>
        </div>
      </div>
      <div className="calendar-grid calendar-weekdays">{(language === "id" ? ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]).map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="calendar-grid">{cells.map((cell, index) => cell
        ? <span key={cell.key} aria-label={`${cell.key}${workoutSet.has(cell.key) ? (language === "id" ? ", latihan selesai" : ", workout completed") : streakSet.has(cell.key) ? (language === "id" ? ", hari streak" : ", login streak day") : ""}`} className={`calendar-day ${cell.key === today ? "calendar-today" : ""} ${workoutSet.has(cell.key) ? "calendar-workout" : streakSet.has(cell.key) ? "calendar-streak" : ""}`}>{cell.day}</span>
        : <span key={`empty-${index}`} className="calendar-empty" />)}</div>
      <div className="calendar-legend"><span><i className="legend-workout" />{language === "id" ? "Hari latihan" : "Workout day"}</span><span><i className="legend-streak" />{language === "id" ? "Hari beruntun" : "Streak day"}</span></div>
    </section>
  );
}

function ExerciseFormGuide({ exerciseName, language }: { exerciseName: string; language: Language }) {
  const [expanded, setExpanded] = useState(false);
  const videoId = formGuideVideos[exerciseName.toLowerCase()];
  const tips = formGuides[exerciseName.toLowerCase()]?.[language] || (language === "id"
    ? ["Kencangkan otot inti dan mulai dengan rentang gerak yang nyaman serta terkendali.", "Jaga posisi sendi tetap sejajar dan lakukan gerakan tanpa terburu-buru.", "Hentikan jika terasa nyeri tajam; sesuaikan posisi atau istirahat."]
    : ["Brace your core and begin with a comfortable, controlled range of motion.", "Keep your joints aligned and avoid rushing through the movement.", "Stop if you feel sharp pain; adjust your position or rest."]);

  return (
    <div className="form-guide">
      <button
        className="form-guide-toggle"
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <Video size={13} />
        {expanded ? (language === "id" ? "Sembunyikan panduan gerakan" : "Hide Form Guide") : (language === "id" ? "Tampilkan panduan gerakan" : "Show Form Guide")}
        <ChevronDown size={13} className={expanded ? "guide-chevron expanded" : "guide-chevron"} />
      </button>
      <div className={`form-guide-collapse ${expanded ? "expanded" : ""}`}>
        <div className="form-guide-body">
          <div className="form-guide-inline">
            <div className="video-player">
              {videoId ? <iframe
                    title={language === "id" ? `Video panduan gerakan ${exerciseName}` : `${exerciseName} form guide video`}
                    src={`https://www.youtube.com/embed/${videoId}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  /> : <p className="video-player-status">{language === "id" ? "Video panduan belum tersedia untuk latihan ini." : "A form video is not available for this exercise yet."}</p>}
            </div>
            <div className="form-guide-content">
              <h3>{language === "id" ? "Panduan teknik" : "Form cues"}</h3>
              <ol>{tips.map((tip) => <li key={tip}>{tip}</li>)}</ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("id");
  const [data, setData] = useState<SavedState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [nav, setNav] = useState<NavKey>("home");
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [, setClockTick] = useState(0);
  const [showStreakPopup, setShowStreakPopup] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [exerciseName, setExerciseName] = useState("");
  const [muscle, setMuscle] = useState("Chest");
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [showNutritionForm, setShowNutritionForm] = useState(false);
  const [nutritionForm, setNutritionForm] = useState({ calories: "", protein: "", carbs: "", fat: "" });
  const [authUser, setAuthUser] = useState<{ id: string; email?: string } | null>(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Saved on this device");
  const timerPreset = data.timerPreset;
  const todayKey = localDateKey(new Date());
  const currentStreak = calculateStreak(data.streakDays, todayKey);
  const isIndonesian = language === "id";

  const stopwatchSeconds = data.stopwatchElapsed + (data.stopwatchStartedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(data.stopwatchStartedAt).getTime()) / 1000))
    : 0);

  const todayNutritionLogs = useMemo(() => {
    return data.nutritionLogs.filter((entry) => localDateKey(new Date(entry.at)) === todayKey);
  }, [data.nutritionLogs, todayKey]);
  const nutrition = useMemo(() => todayNutritionLogs.reduce(
    (totals, entry) => ({ calories: totals.calories + entry.calories, protein: totals.protein + entry.protein, carbs: totals.carbs + entry.carbs, fat: totals.fat + entry.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  ), [todayNutritionLogs]);
  const completedSets = data.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.done).length, 0);
  const totalSets = data.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem(languageStorageKey);
      if (savedLanguage === "id" || savedLanguage === "en") setLanguage(savedLanguage);
    } catch (error) {
      console.error("Could not load SelfTrain language preference.", error);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "id" ? "id" : "en";
    try {
      localStorage.setItem(languageStorageKey, language);
    } catch (error) {
      console.error("Could not save SelfTrain language preference.", error);
    }
  }, [language]);

  useEffect(() => {
    let loaded = emptyState;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) loaded = { ...emptyState, ...JSON.parse(saved) as Partial<SavedState> };
    } catch (error) {
      console.error("Could not load SelfTrain data from local storage.", error);
    }
    const today = localDateKey(new Date());
    const streakDays = [...new Set(loaded.streakDays || [])];
    const shouldShowStreak = loaded.streakPopupDate !== today;
    if (!streakDays.includes(today)) streakDays.push(today);
    loaded = { ...loaded, streakDays, streakPopupDate: today };
    setData(loaded);
    setShowStreakPopup(shouldShowStreak);
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

  useEffect(() => {
    if (!data.stopwatchStartedAt) return;
    const interval = window.setInterval(() => setClockTick((tick) => tick + 1), 1000);
    return () => window.clearInterval(interval);
  }, [data.stopwatchStartedAt]);

  useEffect(() => {
    if (!hydrated || !data.streakDays.includes(todayKey)) return;
    const supabase = getSupabaseClient();
    if (!supabase || !authUser) return;
    void supabase.from("daily_activity").upsert({
      user_id: authUser.id,
      activity_date: todayKey,
      did_login: true,
      did_workout: data.workoutDays.includes(todayKey),
    }, { onConflict: "user_id,activity_date" }).then(({ error }) => {
      if (error) console.error("Could not sync daily streak activity.", error);
    });
  }, [authUser, data.streakDays, data.workoutDays, hydrated, todayKey]);

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
    setData((current) => ({
      ...current,
      workoutLogs: [record, ...current.workoutLogs].slice(0, 250),
      workoutDays: current.workoutDays.includes(todayKey) ? current.workoutDays : [...current.workoutDays, todayKey],
    }));
    const supabase = getSupabaseClient();
    if (supabase && authUser) {
      void supabase.from("workout_logs").insert({ user_id: authUser.id, exercise_name: record.name, muscle_group: record.muscle, weight_kg: record.weight, reps: record.reps, set_number: record.setNumber, logged_at: record.at })
        .then(({ error }) => { if (error) console.error("Could not save workout log.", error); });
      void supabase.from("daily_activity").upsert({
        user_id: authUser.id, activity_date: todayKey, did_login: true, did_workout: true,
      }, { onConflict: "user_id,activity_date" }).then(({ error }) => {
        if (error) console.error("Could not sync workout calendar activity.", error);
      });
    }
    setTimerSeconds(timerPreset);
  }

  function setTimerPreference(seconds: number) {
    setData((current) => ({ ...current, timerPreset: seconds }));
  }

  function toggleStopwatch() {
    setData((current) => {
      if (current.stopwatchStartedAt) {
        const elapsed = current.stopwatchElapsed + Math.max(0, Math.floor((Date.now() - new Date(current.stopwatchStartedAt).getTime()) / 1000));
        return { ...current, stopwatchElapsed: elapsed, stopwatchStartedAt: "" };
      }
      return { ...current, stopwatchStartedAt: new Date().toISOString() };
    });
  }

  function resetStopwatch() {
    setData((current) => ({ ...current, stopwatchElapsed: 0, stopwatchStartedAt: "" }));
  }

  function changeCalendarMonth(direction: number) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
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
    { key: "home", label: isIndonesian ? "Hari ini" : "Today", icon: Activity },
    { key: "workout", label: isIndonesian ? "Latihan" : "Workout", icon: Dumbbell },
    { key: "nutrition", label: isIndonesian ? "Nutrisi" : "Nutrition", icon: Utensils },
    { key: "progress", label: isIndonesian ? "Progres" : "Progress", icon: BarChart3 },
  ];

  return (
    <main className="app-shell">
      <aside className="desktop-sidebar">
        <a className="brand" href="#" onClick={() => setNav("home")}><span className="brand-mark"><Activity size={19} /></span>selftrain<span className="brand-dot">.</span></a>
        <p className="nav-caption">{isIndonesian ? "RUANG KERJA" : "WORKSPACE"}</p>
        <nav className="side-nav" aria-label={isIndonesian ? "Navigasi utama" : "Main navigation"}>
          {navigation.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setNav(key)} className={`nav-item ${nav === key ? "selected" : ""}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{key === "workout" && completedSets > 0 && <span className="nav-count">{completedSets}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><Sparkles size={17} /><div><strong>{isIndonesian ? "Langkah kecil, kekuatan besar." : "Small steps, big strength."}</strong><p>{isIndonesian ? "Tunjukkan usaha untuk dirimu hari ini." : "Show up for yourself today."}</p></div></div>
          <button className="nav-item settings-link" onClick={() => authUser ? void signOut() : void signIn()}><Settings2 size={18} /><span>{authUser ? (isIndonesian ? "Keluar" : "Sign out") : (isIndonesian ? "Hubungkan akun" : "Connect account")}</span></button>
        </div>
      </aside>

      <section className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><Activity size={18} /></span><span>selftrain<span className="brand-dot">.</span></span></div>
          <div className="topbar-date"><span className="online-dot" /> {new Intl.DateTimeFormat(isIndonesian ? "id-ID" : "en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</div>
          <label className="language-switcher">
            <span className="sr-only">{isIndonesian ? "Pilih bahasa" : "Choose language"}</span>
            <select aria-label={isIndonesian ? "Pilih bahasa" : "Choose language"} value={language} onChange={(event) => {
              const selectedLanguage = event.currentTarget.value;
              if (selectedLanguage === "id" || selectedLanguage === "en") setLanguage(selectedLanguage);
            }}>
              <option value="id">ID</option>
              <option value="en">EN</option>
            </select>
          </label>
          <button className="connect-button" onClick={() => authUser ? void signOut() : void signIn()}>
            {authUser ? <><CheckCircle2 size={15} /> {isIndonesian ? "Terhubung" : "Connected"}</> : <>{isIndonesian ? "Hubungkan Google" : "Connect Google"} <ArrowUpRight size={15} /></>}
          </button>
        </header>

        <div className="content">
          {nav === "home" && (
            <>
              <section className="welcome-row">
                <div><span className="eyebrow">{isIndonesian ? "RUANG LATIHAN PRIBADIMU" : "YOUR PERSONAL TRAINING SPACE"}</span><h1>{isIndonesian ? <>Jadikan hari ini <span>berarti.</span></> : <>Make today <span>count.</span></>}</h1><p>{isIndonesian ? "Kemajuan kecil tetaplah kemajuan. Ayo mulai." : "A little progress is still progress. Let's get after it."}</p></div>
                <div className="streak-card"><div className="streak-icon"><Flame size={18} /></div><div><strong>{isIndonesian ? "Jaga konsistensimu" : "Keep your streak"}</strong><span>{isIndonesian ? "Satu sesi setiap kali" : "One session at a time"}</span></div><ArrowUpRight size={16} className="streak-arrow" /></div>
              </section>

              <section className="stats-grid">
                <div className="stat-card"><div className="stat-label"><span>{isIndonesian ? "LATIHAN" : "WORKOUT"}</span><Dumbbell size={17} /></div><strong>{completedSets}<small> / {totalSets}</small></strong><p>{isIndonesian ? "set selesai hari ini" : "sets completed today"}</p><ProgressBar value={completedSets} max={totalSets} /></div>
                <div className="stat-card"><div className="stat-label"><span>{isIndonesian ? "KALORI" : "CALORIES"}</span><Flame size={17} /></div><strong>{nutrition.calories.toLocaleString()}<small> kcal</small></strong><p>{isIndonesian ? "dari target 2.000 kcal harian" : "of 2,000 kcal daily goal"}</p><ProgressBar value={nutrition.calories} max={2000} color="bg-orange" /></div>
                <div className="stat-card"><div className="stat-label"><span>PROTEIN</span><Target size={17} /></div><strong>{nutrition.protein}<small> / 120 g</small></strong><p>{isIndonesian ? "dukung pemulihanmu" : "fuel your recovery"}</p><ProgressBar value={nutrition.protein} max={120} color="bg-blue" /></div>
              </section>

              <section className="section-block">
                <div className="section-heading"><div><span className="eyebrow">{isIndonesian ? "MULAI LATIHAN" : "GET STARTED"}</span><h2>{isIndonesian ? "Pilih program latihan" : "Choose your program"}</h2></div><span className="section-note">{isIndonesian ? "Dirancang untuk keseharianmu" : "Built for real life"}</span></div>
                <div className="program-grid">
                  {programs.map((program, index) => (
                    <button className="program-card" key={program.name} onClick={() => loadProgram(index)}>
                      <div className={`program-art art-${index}`}><Dumbbell size={22} /><span>0{index + 1}</span></div>
                      <div className="program-copy"><span className="program-tag">{isIndonesian ? ["PEMULA", "POPULER", "FLEKSIBEL", "BERAT BADAN"][index] : ["STARTER", "POPULAR", "FLEXIBLE", "BODYWEIGHT"][index]}</span><h3>{isIndonesian ? ["Latihan Seluruh Tubuh Pemula", "Push-Pull-Legs (PPL)", "Split Tubuh Atas/Bawah", "Kalistenik Seluruh Tubuh (Tanpa Alat)"][index] : program.name}</h3><p>{isIndonesian ? ["3 hari / minggu · 5 gerakan", "6 hari / minggu · hari push", "4 hari / minggu · tubuh atas", "3 hari / minggu · 7 gerakan berat badan"][index] : program.subtitle}</p></div>
                      <span className="program-action"><ArrowUpRight size={16} /></span>
                    </button>
                  ))}
                </div>
              </section>

              <div className="dashboard-columns">
                <section className="panel today-panel">
                  <div className="panel-heading"><div><span className="eyebrow">{isIndonesian ? "SEDANG BERLANGSUNG" : "IN PROGRESS"}</span><h2>{localizedWorkoutName(data.workoutName, language)}</h2></div><button className="text-button" onClick={() => setNav("workout")}>{isIndonesian ? "Buka latihan" : "Open workout"} <ArrowUpRight size={14} /></button></div>
                  {data.exercises.length ? <div className="mini-exercise-list">{data.exercises.slice(0, 3).map((exercise) => (
                    <div className="mini-exercise" key={exercise.id}><span className="mini-icon"><Dumbbell size={15} /></span><span className="mini-name">{exercise.name}<small>{localizedMuscle(exercise.muscle, language)}</small></span><span className="mini-progress">{exercise.sets.filter((set) => set.done).length}/{exercise.sets.length} {isIndonesian ? "set" : "sets"}</span></div>
                  ))}</div> : <div className="empty-inline"><span className="empty-icon"><Dumbbell size={18} /></span><span>{isIndonesian ? "Latihanmu menanti." : "Your workout is waiting."}<small>{isIndonesian ? "Pilih program untuk mulai bergerak." : "Choose a program to get moving."}</small></span></div>}
                </section>

                <section className="panel nutrition-panel">
                  <div className="panel-heading"><div><span className="eyebrow">{isIndonesian ? "ASUPAN HARIAN" : "DAILY FUEL"}</span><h2>{isIndonesian ? "Nutrisi" : "Nutrition"}</h2></div><button className="icon-button" aria-label={isIndonesian ? "Catat makanan" : "Log food"} onClick={() => setShowNutritionForm(true)}><Plus size={18} /></button></div>
                  <div className="nutrition-summary"><span className="calorie-ring"><Flame size={18} /></span><div><strong>{nutrition.calories.toLocaleString()} <small>kcal</small></strong><span>{isIndonesian ? "dari target 2.000 harian" : "of 2,000 daily goal"}</span></div></div>
                  <div className="macro-row"><div className="macro-label"><span>Protein</span><strong>{nutrition.protein}<small> / 120g</small></strong></div><ProgressBar value={nutrition.protein} max={120} color="bg-emerald" /></div>
                  <div className="macro-row"><div className="macro-label"><span>{isIndonesian ? "Karbohidrat" : "Carbs"}</span><strong>{nutrition.carbs}<small> / 250g</small></strong></div><ProgressBar value={nutrition.carbs} max={250} color="bg-purple" /></div>
                  <button className="quick-add-button" onClick={() => setNav("nutrition")}><Plus size={16} /> {isIndonesian ? "Tambah makanan cepat" : "Quick add food"}</button>
                </section>
              </div>
              <div className="home-calendar-row">
                <ActivityCalendar month={calendarMonth} workoutDays={data.workoutDays} streakDays={data.streakDays} onMonthChange={changeCalendarMonth} language={language} />
                <section className="panel streak-summary">
                  <span className="streak-icon"><Flame size={20} /></span>
                  <span className="eyebrow">{isIndonesian ? "STREAK CHECK-IN HARIAN" : "DAILY CHECK-IN STREAK"}</span>
                  <strong>{currentStreak} <small>{isIndonesian ? "hari" : currentStreak === 1 ? "day" : "days"}</small></strong>
                  <p>{isIndonesian ? (currentStreak > 1 ? "Konsistensimu luar biasa. Jaga streak-mu besok!" : "Check-in setiap hari untuk membangun streak-mu.") : (currentStreak > 1 ? "Nice consistency. Keep the streak alive tomorrow." : "Check in each day to build your streak.")}</p>
                  <div className="streak-summary-footer"><CheckCircle2 size={15} /> {isIndonesian ? "Check-in hari ini tercatat" : "Today checked in"}</div>
                </section>
              </div>
              <footer className="footer-note"><span>{isIndonesian ? "Berlatih dengan ritmemu sendiri." : "Made for your own pace."}</span><span>{localizedSyncMessage(syncMessage, language)}</span></footer>
            </>
          )}

          {nav === "workout" && (
            <>
              <section className="page-intro">
                <span className="eyebrow">{isIndonesian ? "CATATAN LATIHAN" : "TRAINING LOG"}</span><h1>{localizedWorkoutName(data.workoutName, language)}</h1><p>{isIndonesian ? "Setiap repetisi berarti. Catat latihanmu dan terus berkembang." : "Every rep counts. Record your work and keep getting stronger."}</p>
                <div className="workout-progress"><span><CheckCircle2 size={15} /> {isIndonesian ? `${completedSets} dari ${totalSets} set selesai` : `${completedSets} of ${totalSets} sets done`}</span><ProgressBar value={completedSets} max={totalSets} /></div>
              </section>
              <div className="workout-toolbar">
                <div className="toolbar-select"><Dumbbell size={15} /><span>{data.exercises.length} {isIndonesian ? "latihan" : "exercises"}</span><ChevronDown size={14} /></div>
                <button className="primary-button" onClick={() => setShowExerciseForm(true)}><Plus size={16} /> {isIndonesian ? "Tambah latihan" : "Add exercise"}</button>
              </div>
              <section className="session-clock panel">
                <div className="session-clock-heading"><span className="eyebrow">{isIndonesian ? "ALAT SESI" : "SESSION TOOLS"}</span><span className="clock-status">{timerSeconds !== null ? (isIndonesian ? "WAKTU ISTIRAHAT" : "REST IN PROGRESS") : data.stopwatchStartedAt ? (isIndonesian ? "SESI BERLANGSUNG" : "SESSION RUNNING") : (isIndonesian ? "SIAP KAPAN SAJA" : "READY WHEN YOU ARE")}</span></div>
                <div className="session-clock-tools">
                  <div className="rest-tool">
                    <span className="clock-tool-icon rest-tool-icon"><Timer size={17} /></span>
                    <div className="clock-tool-main"><strong>{isIndonesian ? "Timer istirahat" : "Rest timer"}</strong><span>{timerSeconds === null ? (isIndonesian ? "Otomatis dimulai setelah set selesai" : "Auto-starts when you complete a set") : (isIndonesian ? `sisa ${formatTime(timerSeconds)}` : `${formatTime(timerSeconds)} remaining`)}</span></div>
                    <button className="clock-start-button" onClick={() => setTimerSeconds(timerPreset)}><Play size={14} /> {timerSeconds === null ? (isIndonesian ? "Mulai" : "Start") : (isIndonesian ? "Ulangi" : "Restart")}</button>
                  </div>
                  <div className="stopwatch-tool">
                    <span className="clock-tool-icon stopwatch-icon"><Clock3 size={17} /></span>
                    <div className="clock-tool-main"><strong>Stopwatch</strong><span className="stopwatch-display">{formatTime(stopwatchSeconds)}</span></div>
                    <button className="clock-start-button" onClick={toggleStopwatch}>{data.stopwatchStartedAt ? <><Pause size={14} /> {isIndonesian ? "Jeda" : "Pause"}</> : <><Play size={14} /> {isIndonesian ? "Mulai" : "Start"}</>}</button>
                    <button className="clock-reset-button" aria-label={isIndonesian ? "Atur ulang stopwatch" : "Reset stopwatch"} onClick={resetStopwatch}><RotateCcw size={15} /></button>
                  </div>
                </div>
                <div className="clock-presets"><span>{isIndonesian ? "DURASI ISTIRAHAT" : "REST PRESET"}</span>{timers.map((seconds) => <button key={seconds} className={timerPreset === seconds ? "active" : ""} onClick={() => setTimerPreference(seconds)}>{seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}</button>)}</div>
              </section>
              {!data.exercises.length && <div className="empty-state panel"><span className="empty-icon large"><Dumbbell size={24} /></span><h2>{isIndonesian ? "Mulai dengan program" : "Start with a program"}</h2><p>{isIndonesian ? "Muat latihan siap pakai atau tambahkan latihanmu sendiri." : "Load a ready-made workout or add your own exercises."}</p><button className="primary-button" onClick={() => setNav("home")}>{isIndonesian ? "Lihat program" : "Browse programs"} <ArrowUpRight size={15} /></button></div>}
              <div className="exercise-list">
                {data.exercises.map((exercise, exerciseIndex) => {
                  const previous = lastPerformance(exercise.name);
                  const bodyweight = isBodyweight(exercise);
                  return <article className="exercise-card panel" key={exercise.id}>
                    <div className="exercise-card-head"><span className="exercise-index">{String(exerciseIndex + 1).padStart(2, "0")}</span><div className="exercise-title"><h2>{exercise.name}</h2><span>{localizedMuscle(exercise.muscle, language)}</span></div>
                      {previous && <span className="last-performance"><span>{isIndonesian ? "LATIHAN TERAKHIR" : "LAST PERFORMANCE"}</span>{bodyweight ? (isIndonesian ? "Berat badan" : "Bodyweight") : `${previous.weight} kg`} × {previous.reps} {isIndonesian ? "repetisi" : "reps"}</span>}
                      <button className="icon-button remove-button" aria-label={isIndonesian ? `Hapus ${exercise.name}` : `Remove ${exercise.name}`} onClick={() => setData((current) => ({ ...current, exercises: current.exercises.filter((item) => item.id !== exercise.id) }))}><Trash2 size={16} /></button>
                    </div>
                    <ExerciseFormGuide exerciseName={exercise.name} language={language} />
                    <div className={`set-head ${bodyweight ? "bodyweight-head" : ""}`}><span>{isIndonesian ? "SET" : "SET"}</span><span>{bodyweight ? (isIndonesian ? "BERAT BADAN" : "BODYWEIGHT") : <>{isIndonesian ? "BEBAN" : "WEIGHT"} <small>kg</small></>}</span><span>{exercise.name.toLowerCase() === "planks" ? (isIndonesian ? "DETIK" : "SECONDS") : (isIndonesian ? "REPETISI" : "REPS")}</span><span>{isIndonesian ? "SELESAI" : "DONE"}</span></div>
                    <div className="set-list">{exercise.sets.map((set, setIndex) => <div className={`set-row ${set.done ? "set-complete" : ""}`} key={set.id}>
                      <span className="set-number">{String(setIndex + 1).padStart(2, "0")}</span>
                      <label className="number-field"><input aria-label={isIndonesian ? `${exercise.name} set ${setIndex + 1} beban dalam kg` : `${exercise.name} set ${setIndex + 1} weight in kg`} inputMode="decimal" type="number" min="0" step="0.5" value={set.weight} onChange={(event) => updateSet(exercise.id, set.id, { weight: Number(event.target.value) })} /></label>
                      <label className="number-field"><input aria-label={isIndonesian ? `${exercise.name} set ${setIndex + 1} ${exercise.name.toLowerCase() === "planks" ? "detik" : "repetisi"}` : `${exercise.name} set ${setIndex + 1} ${exercise.name.toLowerCase() === "planks" ? "seconds" : "reps"}`} inputMode="numeric" type="number" min="0" step="1" value={set.reps} onChange={(event) => updateSet(exercise.id, set.id, { reps: Number(event.target.value) })} /></label>
                      <button aria-label={set.done ? (isIndonesian ? "Tandai set belum selesai" : "Mark set incomplete") : (isIndonesian ? "Selesaikan set" : "Complete set")} className={`check-button ${set.done ? "checked" : ""}`} onClick={() => completeSet(exercise, set)}>{set.done && <Check size={15} />}</button>
                    </div>)}</div>
                    <div className="exercise-card-foot"><button className="add-set-button" onClick={() => addSet(exercise.id)}><Plus size={14} /> {isIndonesian ? "Tambah set" : "Add set"}</button><span>{exercise.sets.filter((set) => set.done).length} / {exercise.sets.length} {isIndonesian ? "selesai" : "complete"}</span></div>
                  </article>;
                })}
              </div>
              <footer className="footer-note"><span>{isIndonesian ? "Konsistensi lebih penting daripada kesempurnaan." : "Consistency over perfection."}</span><span>{localizedSyncMessage(syncMessage, language)}</span></footer>
            </>
          )}

          {nav === "nutrition" && (
            <>
              <section className="page-intro"><span className="eyebrow">{isIndonesian ? "NUTRISI HARIAN" : "DAILY NUTRITION"}</span><h1>{isIndonesian ? <>Dukung <span>progresmu.</span></> : <>Fuel your <span>progress.</span></>}</h1><p>{isIndonesian ? "Catatan sederhana untuk mendukung latihanmu." : "Simple tracking to support the work you put in."}</p></section>
              <div className="nutrition-page-grid">
                <section className="panel nutrition-goals">
                  <div className="panel-heading"><div><span className="eyebrow">{isIndonesian ? "ASUPAN HARI INI" : "TODAY'S INTAKE"}</span><h2>{isIndonesian ? "Ringkasan harian" : "Daily overview"}</h2></div><span className="date-pill">{isIndonesian ? "Hari ini" : "Today"}</span></div>
                  <div className="calorie-large"><div className="calorie-ring big"><Flame size={21} /></div><div><strong>{nutrition.calories.toLocaleString()}</strong><span>{isIndonesian ? "kcal dikonsumsi" : "kcal consumed"} <i>/ {isIndonesian ? "2.000" : "2,000"} kcal</i></span></div></div>
                  <ProgressBar value={nutrition.calories} max={2000} color="bg-orange" />
                  <div className="macro-overview">
                    {[{ name: "Protein", label: "Protein", idLabel: "Protein", value: nutrition.protein, goal: 120, color: "bg-emerald", unit: "g" }, { name: "Carbs", label: "Carbs", idLabel: "Karbohidrat", value: nutrition.carbs, goal: 250, color: "bg-purple", unit: "g" }, { name: "Fat", label: "Fat", idLabel: "Lemak", value: nutrition.fat, goal: 70, color: "bg-blue", unit: "g" }].map((macro) => <div className="macro-card" key={macro.name}><div><span>{isIndonesian ? macro.idLabel : macro.label}</span><strong>{macro.value}<small> / {macro.goal}{macro.unit}</small></strong></div><ProgressBar value={macro.value} max={macro.goal} color={macro.color} /></div>)}
                  </div>
                </section>
                <section className="panel quick-add-panel">
                  <div className="panel-heading"><div><span className="eyebrow">{isIndonesian ? "PRAKTIS" : "LOW FRICTION"}</span><h2>{isIndonesian ? "Tambah cepat" : "Quick add"}</h2></div><span className="sparkle-badge"><Sparkles size={15} /></span></div>
                  <p>{isIndonesian ? "Pilih preset untuk langsung mencatat." : "Tap a preset to log it instantly."}</p>
                  <button className="preset-button calorie-preset" onClick={() => addNutrition({ calories: 250, protein: 0, carbs: 0, fat: 0 })}><span className="preset-symbol"><Flame size={18} /></span><span><strong>+250 kcal</strong><small>{isIndonesian ? "Tambah kalori cepat" : "Quick calorie add"}</small></span><Plus size={17} /></button>
                  <button className="preset-button protein-preset" onClick={() => addNutrition({ calories: 0, protein: 25, carbs: 0, fat: 0 })}><span className="preset-symbol"><Target size={18} /></span><span><strong>+25g protein</strong><small>{isIndonesian ? "Protein shake / camilan" : "Protein shake / snack"}</small></span><Plus size={17} /></button>
                  <button className="secondary-button full-button" onClick={() => setShowNutritionForm(true)}><Plus size={16} /> {isIndonesian ? "Catat detail makanan" : "Log meal details"}</button>
                </section>
              </div>
              <section className="panel log-panel"><div className="panel-heading"><div><span className="eyebrow">{isIndonesian ? "CATATANMU" : "YOUR ENTRIES"}</span><h2>{isIndonesian ? "Catatan makanan hari ini" : "Today's food log"}</h2></div><span className="log-count">{data.nutritionLogs.length} {isIndonesian ? "entri" : "entries"}</span></div>
                {todayNutritionLogs.length ? <div className="food-log-list">{todayNutritionLogs.map((entry, index) => <div className="food-log-entry" key={`${entry.at}-${index}`}><span className="food-log-icon"><Utensils size={16} /></span><span className="food-log-desc">{entry.calories ? (isIndonesian ? "Makanan / tambah cepat" : "Food / quick add") : (isIndonesian ? "Tambah protein cepat" : "Protein quick add")}<small>{new Date(entry.at).toLocaleTimeString(language === "id" ? "id-ID" : "en-US", { hour: "numeric", minute: "2-digit" })} · {entry.protein}g {isIndonesian ? "protein" : "protein"} · {entry.carbs}g {isIndonesian ? "karbohidrat" : "carbs"} · {entry.fat}g {isIndonesian ? "lemak" : "fat"}</small></span><strong>{entry.calories} <small>kcal</small></strong></div>)}</div> : <div className="empty-inline"><span className="empty-icon"><Utensils size={17} /></span><span>{isIndonesian ? "Belum ada makanan yang dicatat." : "No food logged yet."}<small>{isIndonesian ? "Gunakan tambah cepat untuk memulai." : "Use a quick add to get started."}</small></span></div>}
              </section>
              <footer className="footer-note"><span>{isIndonesian ? "Asupan baik, tubuh bugar." : "Fuel well. Feel good."}</span><span>{localizedSyncMessage(syncMessage, language)}</span></footer>
            </>
          )}

          {nav === "progress" && (
            <>
              <section className="page-intro"><span className="eyebrow">{isIndonesian ? "PERJALANANMU" : "YOUR JOURNEY"}</span><h1>{isIndonesian ? <>Progres yang <span>terus bergerak.</span></> : <>Progress, <span>in motion.</span></>}</h1><p>{isIndonesian ? "Setiap set yang tercatat membuktikan kamu sudah berusaha." : "Every logged set is proof you showed up."}</p></section>
              <section className="stats-grid progress-stats">
                <div className="stat-card"><div className="stat-label"><span>{isIndonesian ? "TOTAL SET LATIHAN" : "TOTAL WORKOUT SETS"}</span><Dumbbell size={17} /></div><strong>{data.workoutLogs.length}</strong><p>{isIndonesian ? "set tercatat sepanjang waktu" : "sets recorded all-time"}</p></div>
                <div className="stat-card"><div className="stat-label"><span>{isIndonesian ? "KALORI TERCATAT" : "CALORIES LOGGED"}</span><Flame size={17} /></div><strong>{data.nutritionLogs.reduce((total, entry) => total + entry.calories, 0).toLocaleString()}</strong><p>{isIndonesian ? "kcal dalam catatan makanan" : "kcal in your food log"}</p></div>
                <div className="stat-card"><div className="stat-label"><span>{isIndonesian ? "LATIHAN" : "EXERCISES"}</span><Activity size={17} /></div><strong>{new Set(data.workoutLogs.map((log) => log.name)).size}</strong><p>{isIndonesian ? "gerakan berbeda yang dilatih" : "unique movements trained"}</p></div>
              </section>
              <section className="panel log-panel"><div className="panel-heading"><div><span className="eyebrow">{isIndonesian ? "LATIHAN TERBARU" : "RECENT TRAINING"}</span><h2>{isIndonesian ? "Riwayat latihan" : "Workout history"}</h2></div><span className="log-count">{data.workoutLogs.length} {isIndonesian ? "set" : "sets"}</span></div>
                {data.workoutLogs.length ? <div className="food-log-list">{data.workoutLogs.slice(0, 20).map((log, index) => <div className="food-log-entry" key={`${log.at}-${index}`}><span className="food-log-icon workout-log-icon"><Dumbbell size={16} /></span><span className="food-log-desc">{log.name}<small>{localizedMuscle(log.muscle, language)} · {isIndonesian ? "Set" : "Set"} {log.setNumber} · {new Date(log.at).toLocaleDateString(language === "id" ? "id-ID" : "en-US")}</small></span><strong>{log.weight} <small>kg × {log.reps}</small></strong></div>)}</div> : <div className="empty-inline"><span className="empty-icon"><BarChart3 size={17} /></span><span>{isIndonesian ? "Belum ada catatan." : "Nothing logged yet."}<small>{isIndonesian ? "Selesaikan satu set untuk mulai mencatat." : "Complete a set to start your history."}</small></span></div>}
              </section>
              <footer className="footer-note"><span>{isIndonesian ? "Dibangun sedikit demi sedikit." : "Built one day at a time."}</span><span>{localizedSyncMessage(syncMessage, language)}</span></footer>
            </>
          )}
        </div>
      </section>

      <nav className="mobile-nav" aria-label={isIndonesian ? "Navigasi" : "Mobile navigation"}>
        {navigation.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setNav(key)} className={nav === key ? "active" : ""}><Icon size={19} strokeWidth={1.9} /><span>{label}</span></button>)}
      </nav>

      {showExerciseForm && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowExerciseForm(false); }}><section className="modal panel" role="dialog" aria-modal="true" aria-labelledby="exercise-modal-title"><button className="modal-close" aria-label={isIndonesian ? "Tutup" : "Close"} onClick={() => setShowExerciseForm(false)}><X size={19} /></button><span className="eyebrow">{isIndonesian ? "SESUAIKAN LATIHAN" : "MAKE IT YOURS"}</span><h2 id="exercise-modal-title">{isIndonesian ? "Tambah latihan" : "Add an exercise"}</h2><p>{isIndonesian ? "Susun sesi sesuai kebutuhanmu." : "Build your session around what works for you."}</p><form onSubmit={addExercise}><label className="form-label">{isIndonesian ? "Nama latihan" : "Exercise name"}<input autoFocus required maxLength={60} list="exercise-suggestions" placeholder={isIndonesian ? "mis. Dumbbell shoulder press" : "e.g. Dumbbell shoulder press"} value={exerciseName} onChange={(event) => { setExerciseName(event.target.value); if (bodyweightExercises.some((name) => name.toLowerCase() === event.target.value.trim().toLowerCase())) setMuscle("Calisthenics / Bodyweight"); }} /><datalist id="exercise-suggestions">{bodyweightExercises.map((name) => <option key={name} value={name} />)}</datalist></label><label className="form-label">{isIndonesian ? "Kelompok otot" : "Muscle group"}<select value={muscle} onChange={(event) => setMuscle(event.target.value)}>{["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Full body", "Calisthenics / Bodyweight", "Other"].map((item) => <option key={item} value={item}>{localizedMuscle(item, language)}</option>)}</select></label><button className="primary-button full-button" type="submit"><Plus size={16} /> {isIndonesian ? "Tambahkan ke latihan" : "Add to workout"}</button></form></section></div>}

      {showNutritionForm && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNutritionForm(false); }}><section className="modal panel" role="dialog" aria-modal="true" aria-labelledby="nutrition-modal-title"><button className="modal-close" aria-label={isIndonesian ? "Tutup" : "Close"} onClick={() => setShowNutritionForm(false)}><X size={19} /></button><span className="eyebrow">{isIndonesian ? "ASUPAN HARIAN" : "DAILY FUEL"}</span><h2 id="nutrition-modal-title">{isIndonesian ? "Catat nutrisi" : "Log nutrition"}</h2><p>{isIndonesian ? "Tambahkan total makanan. Makro boleh dikosongkan." : "Add your meal totals. You can leave any macro blank."}</p><form onSubmit={submitNutrition}><div className="nutrition-form-grid"><label className="form-label">{isIndonesian ? "Kalori" : "Calories"}<input type="number" min="0" max="10000" placeholder="0" value={nutritionForm.calories} onChange={(event) => setNutritionForm({ ...nutritionForm, calories: event.target.value })} /></label><label className="form-label">Protein (g)<input type="number" min="0" max="1000" placeholder="0" value={nutritionForm.protein} onChange={(event) => setNutritionForm({ ...nutritionForm, protein: event.target.value })} /></label><label className="form-label">{isIndonesian ? "Karbohidrat (g)" : "Carbs (g)"}<input type="number" min="0" max="1000" placeholder="0" value={nutritionForm.carbs} onChange={(event) => setNutritionForm({ ...nutritionForm, carbs: event.target.value })} /></label><label className="form-label">{isIndonesian ? "Lemak (g)" : "Fat (g)"}<input type="number" min="0" max="1000" placeholder="0" value={nutritionForm.fat} onChange={(event) => setNutritionForm({ ...nutritionForm, fat: event.target.value })} /></label></div><button className="primary-button full-button" type="submit"><Check size={16} /> {isIndonesian ? "Simpan catatan makanan" : "Save food log"}</button></form></section></div>}

      {showStreakPopup && <div className="modal-backdrop streak-backdrop" role="presentation"><section className="modal panel streak-modal" role="dialog" aria-modal="true" aria-labelledby="streak-modal-title"><button className="modal-close" aria-label={isIndonesian ? "Tutup hadiah streak" : "Close streak reward"} onClick={() => setShowStreakPopup(false)}><X size={19} /></button><span className="streak-reward-icon"><Flame size={27} /></span><span className="eyebrow">{isIndonesian ? "HADIAH CHECK-IN HARIAN" : "DAILY CHECK-IN REWARD"}</span><h2 id="streak-modal-title">{isIndonesian ? `Streak hari ke-${currentStreak} aktif!` : `Day ${currentStreak} Streak Active!`} <span aria-hidden="true">🔥</span></h2><p>{isIndonesian ? "Kamu sudah hadir hari ini. Jaga momentum, selangkah demi selangkah." : "You showed up today. Keep your momentum going, one day at a time."}</p><ActivityCalendar month={calendarMonth} workoutDays={data.workoutDays} streakDays={data.streakDays} onMonthChange={changeCalendarMonth} language={language} /><button className="primary-button full-button" onClick={() => setShowStreakPopup(false)}>{isIndonesian ? "Ayo mulai latihan" : "Let's get moving"} <ArrowRight size={15} /></button></section></div>}

      {timerSeconds !== null && <aside className="timer-overlay" aria-label={isIndonesian ? "Timer istirahat" : "Rest timer"} aria-live="polite"><div className="timer-card panel"><span className="timer-icon"><Timer size={19} /></span><span className="timer-overlay-label">{isIndonesian ? "ISTIRAHAT & PULIH" : "REST & RECOVER"}</span><strong className="timer-countdown">{formatTime(timerSeconds)}</strong><button className="secondary-button timer-skip" onClick={() => setTimerSeconds(null)}>{isIndonesian ? "Lewati" : "Skip"} <X size={14} /></button></div></aside>}
    </main>
  );
}
