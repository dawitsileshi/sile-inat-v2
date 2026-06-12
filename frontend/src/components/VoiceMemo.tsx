import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";

type Lang = "am-ET" | "en-US";

interface PromptSet {
  encourage: string;
  encourageSub: string;
  encourageEnglish: string;
  listening: string;
  stopHint: string;
  startCta: string;
  prompts: string[];
  errorRetry: string;
  notSupported: string;
}

// While she's recording, soft prompts fade in one by one. The "companion"
// bit — when she goes quiet, the prompt gives her something to grab onto,
// the way a friend would. Not a list, not a form.
//
// TODO: Have a native Amharic speaker review and polish the Amharic prompts.
const COPY: Record<Lang, PromptSet> = {
  "en-US": {
    encourage: "Too tired to type?",
    encourageSub:
      "Tap the mic and just say it out loud.\nYour hands can stay on your baby.",
    encourageEnglish: "",
    listening: "I’m listening",
    stopHint: "Tap to stop. I’ll keep what you said.",
    startCta: "Start a voice memo",
    prompts: [
      "What’s been the hardest part today?",
      "When did you last sleep more than two hours in a row?",
      "What did you wish someone would ask you?",
      "What does your body feel like right now?",
      "What’s something you wanted to say, but couldn’t?",
      "If you could say one thing without anyone judging you, what would it be?",
      "When was the last time someone asked how *you* are?",
    ],
    errorRetry: "I couldn’t hear that. Try again in a moment.",
    notSupported:
      "Voice memo isn’t supported in this browser. Try Chrome, Edge, or Safari.",
  },
  "am-ET": {
    encourage: "መጻፍ ደክሞሻል?",
    encourageSub: "ማይክሮፎኑን ተጫነና ሀሳብሽን ብታወሪ ይሻላል።\nእጅሽ ልጅሽን ይዘሽ መቆየት ትችያለሽ።",
    encourageEnglish: "Too tired to type?",
    listening: "እያዳምጥሽ ነኝ",
    stopHint: "ለማቆም ተጫኚ። ያልሽው ይቆያል።",
    startCta: "የድምፅ ማስታወሻ ጀምሪ",
    prompts: [
      "ዛሬ ከሁሉም ይበልጥ የከበደ ነገር ምን ነበር?",
      "መጨረሻ መች ሁለት ሰዓት ሙሉ ተኝተሽ ነበር?",
      "ሰው እንዲጠይቅሽ የምትፈልጊው ጥያቄ ምን ነው?",
      "ሰውነትሽ አሁን ምን ይሰማዋል?",
      "ለማንም ያላልሽው፣ ግን ማለት የፈለግሽው ነገር ምንድን ነው?",
      "ሰው ሳይፈርጅሽ አንድ ነገር ብታወሪ፣ ምን በሆነ?",
      "ሰው ለመጨረሻ ጊዜ አንቺ ራስሽ እንዴት እንደሆንሽ የጠየቀሽ መች ነበር?",
    ],
    errorRetry: "መስማት አልቻልኩም። ትንሽ ቆይተሽ እንደገና ሞክሪ።",
    notSupported: "የድምፅ ማስታወሻ በዚህ ብራውዘር አይደገፍም። Chrome፣ Edge ወይም Safari ሞክሪ።",
  },
};

interface VoiceMemoProps {
  onTranscript: (text: string) => void;
  baseText?: string;
}

export function VoiceMemo({ onTranscript, baseText = "" }: VoiceMemoProps) {
  const [lang, setLang] = useState<Lang>("am-ET");
  const {
    supported,
    listening,
    transcript,
    interim,
    error,
    start,
    stop,
    reset,
  } = useSpeechRecognition({ lang });
  const [promptIdx, setPromptIdx] = useState(0);
  const copy = COPY[lang];

  useEffect(() => {
    if (!listening) {
      setPromptIdx(0);
      return;
    }
    const id = setInterval(
      () => setPromptIdx((i) => (i + 1) % copy.prompts.length),
      6000,
    );
    return () => clearInterval(id);
  }, [listening, copy.prompts.length]);

  useEffect(() => {
    if (!transcript) return;
    const merged = baseText
      ? `${baseText.trimEnd()} ${transcript}`.trim()
      : transcript;
    onTranscript(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  function handleStart() {
    reset();
    start();
  }

  if (!supported) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <p className="flex items-center gap-2 text-xs text-text-secondary">
          <AlertTriangle className="h-3.5 w-3.5" />
          {copy.notSupported}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      layout
      transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
      className={cn(
        "relative overflow-hidden rounded-3xl bg-white px-6 py-8 text-center",
        "ring-1 ring-brand/10 shadow-[0_10px_30px_-12px_rgba(26,122,61,0.25)]",
      )}
    >
      {/* Decorative top accent — quiet brand band */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand-light/50 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-4 top-4 text-brand/20"
      >
        <Sparkles className="h-4 w-4" />
      </div>

      {!listening ? (
        <IdleState
          copy={copy}
          lang={lang}
          onStart={handleStart}
          onLang={setLang}
          error={error}
        />
      ) : (
        <ListeningState
          copy={copy}
          promptIdx={promptIdx}
          interim={interim}
          onStop={stop}
        />
      )}
    </motion.div>
  );
}

// ─── Idle ─────────────────────────────────────────────────────────────────────

function IdleState({
  copy,
  lang,
  onStart,
  onLang,
  error,
}: {
  copy: PromptSet;
  lang: Lang;
  onStart: () => void;
  onLang: (l: Lang) => void;
  error: string | null;
}) {
  return (
    <div className="relative">
      {/* Big mic with halo */}
      <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 animate-pulse rounded-full bg-brand/10" />
        <div className="absolute inset-2 rounded-full bg-brand/20" />
        <button
          type="button"
          onClick={onStart}
          aria-label={copy.startCta}
          className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-white shadow-lg transition-transform hover:scale-[1.05] active:scale-95"
        >
          <Mic className="h-7 w-7" />
        </button>
      </div>

      {/* Bilingual headline — secondary language under primary, when present */}
      <h3 className="text-xl font-bold leading-tight text-text-primary">
        {copy.encourage}
      </h3>
      {copy.encourageEnglish && (
        <p className="mt-1 text-sm font-medium text-text-muted">
          {copy.encourageEnglish}
        </p>
      )}

      <p className="mx-auto mt-3 max-w-xs whitespace-pre-line text-sm leading-relaxed text-text-secondary">
        {copy.encourageSub}
      </p>

      {/* Language pills */}
      <div className="mt-5 inline-flex rounded-full bg-cream-dark/50 p-1">
        <LangPill active={lang === "am-ET"} onClick={() => onLang("am-ET")}>
          አማርኛ
        </LangPill>
        <LangPill active={lang === "en-US"} onClick={() => onLang("en-US")}>
          English
        </LangPill>
      </div>

      {error && error !== "aborted" && (
        <ErrorHint
          code={error}
          lang={lang}
          onTryEnglish={() => onLang("en-US")}
        />
      )}
    </div>
  );
}

function ErrorHint({
  code, lang, onTryEnglish,
}: {
  code: string
  lang: Lang
  onTryEnglish: () => void
}) {
  const en: Record<string, string> = {
    "not-allowed":
      "Microphone access is blocked. Click the 🔒 lock icon next to the URL and allow microphone.",
    "permission-denied":
      "Microphone access is blocked. Click the 🔒 lock icon next to the URL and allow microphone.",
    "language-not-supported":
      "This browser doesn’t support Amharic voice. Try English, or open the site in Chrome.",
    "no-speech": "I didn’t hear anything. Tap the mic and speak after the prompt.",
    "audio-capture": "No microphone found on this device.",
    "network": "Voice transcription needs an internet connection.",
    "service-not-allowed":
      "The browser blocked the voice service. Try reloading, or use Chrome.",
  }
  const am: Record<string, string> = {
    "not-allowed":
      "ማይክሮፎኑን መድረስ አልተፈቀደም። ከURL ቀጥሎ ያለውን 🔒 ምልክት ተጫነና ፍቀጂ።",
    "permission-denied":
      "ማይክሮፎኑን መድረስ አልተፈቀደም። ከURL ቀጥሎ ያለውን 🔒 ምልክት ተጫነና ፍቀጂ።",
    "language-not-supported":
      "ይህ ብራውዘር አማርኛን አይደግፍም። English ሞክሪ ወይም Chrome ተጠቀሚ።",
    "no-speech": "ምንም ድምፅ አልሰማሁም። ማይክሮፎኑን ተጫነና ተናገሪ።",
    "audio-capture": "በዚህ መሣሪያ ላይ ማይክሮፎን አልተገኘም።",
    "network": "ለድምፅ ቀረጻ የኢንተርኔት ግንኙነት ያስፈልጋል።",
    "service-not-allowed":
      "ብራውዘር የድምፅ አገልግሎቱን ዘጋ። እንደገና ጫን ወይም Chrome ሞክሪ።",
  }
  const dict = lang === "am-ET" ? am : en
  const fallbackPrefix =
    lang === "am-ET" ? "መስማት አልቻልኩም" : "Couldn’t hear that"
  const text = dict[code] ?? `${fallbackPrefix} (${code}).`

  const showTryEnglish = lang === "am-ET" && code === "language-not-supported"

  return (
    <div className="mt-5 rounded-xl bg-cream/70 px-4 py-3 text-left">
      <p className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-text-muted" />
        <span>{text}</span>
      </p>
      {showTryEnglish && (
        <button
          type="button"
          onClick={onTryEnglish}
          className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-dark"
        >
          Switch to English
        </button>
      )}
    </div>
  )
}

// ─── Listening ────────────────────────────────────────────────────────────────

function ListeningState({
  copy,
  promptIdx,
  interim,
  onStop,
}: {
  copy: PromptSet;
  promptIdx: number;
  interim: string;
  onStop: () => void;
}) {
  return (
    <div className="relative">
      {/* Stop button with two concentric ping rings */}
      <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand/20" />
        <span
          className="absolute inset-2 animate-ping rounded-full bg-brand/30"
          style={{ animationDelay: "400ms" }}
        />
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop voice memo"
          className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-white shadow-lg transition-transform hover:scale-[1.03]"
        >
          <Square className="h-5 w-5 fill-white" />
        </button>
      </div>

      <p className="text-lg font-semibold text-text-primary">
        {copy.listening}
      </p>
      <p className="mt-1 text-xs text-text-muted">{copy.stopHint}</p>

      {/* Rotating gentle prompts — the companion bit */}
      <div className="mt-6 flex min-h-[4rem] items-center justify-center px-2">
        <AnimatePresence mode="wait">
          <motion.p
            key={promptIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.7 }}
            className="text-center text-base italic leading-relaxed text-text-secondary"
          >
            {copy.prompts[promptIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {interim && (
        <p className="mx-auto mt-2 max-w-md rounded-lg bg-cream/70 px-3 py-2 text-xs italic text-text-muted">
          {interim}
        </p>
      )}
    </div>
  );
}

function LangPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-brand text-white shadow-sm"
          : "text-text-secondary hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}
