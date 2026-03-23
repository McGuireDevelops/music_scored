import { useState, useMemo } from "react";
import type { QuizQuestion } from "@learning-scores/shared";
import { allKeys, commonChordTypes } from "@learning-scores/shared";
import { httpsCallable, functions } from "../../firebase";
import { buildChordSpellingQuestion } from "../../utils/quizChordSpellingBuild";

type Props = {
  quizId: string;
  onClose: () => void;
  onAdded: () => void;
  addQuestion: (data: Omit<QuizQuestion, "id">) => Promise<void>;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function QuizGenerateModal({ quizId, onClose, onAdded, addQuestion }: Props) {
  const [tab, setTab] = useState<"template" | "ai">("template");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set(["C Major", "G Major"]));
  const [selectedChords, setSelectedChords] = useState<Set<string>>(
    () => new Set(["V7", "ii6", "IV"])
  );
  const [count, setCount] = useState(8);
  const [preview, setPreview] = useState<Omit<QuizQuestion, "id">[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<Set<number>>(new Set());
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiPreview, setAiPreview] = useState<Omit<QuizQuestion, "id">[]>([]);
  const [selectedAi, setSelectedAi] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keysList = useMemo(() => allKeys(), []);
  const chordsList = useMemo(() => commonChordTypes(), []);

  const toggleKey = (k: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };
  const toggleChord = (c: string) => {
    setSelectedChords((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const runTemplatePreview = () => {
    setError(null);
    const combos: Omit<QuizQuestion, "id">[] = [];
    for (const k of selectedKeys) {
      for (const ch of selectedChords) {
        const q = buildChordSpellingQuestion(k, ch, 1);
        if (q) combos.push(q);
      }
    }
    const shuffled = shuffle(combos);
    const n = Math.min(Math.max(1, count), shuffled.length || count);
    const slice = shuffled.slice(0, n);
    setPreview(slice);
    setSelectedPreview(new Set(slice.map((_, i) => i)));
  };

  const addTemplateBatch = async () => {
    setBusy(true);
    setError(null);
    try {
      for (let i = 0; i < preview.length; i++) {
        if (!selectedPreview.has(i)) continue;
        await addQuestion(preview[i]!);
      }
      onAdded();
      onClose();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed to add some questions.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const runAi = async () => {
    setError(null);
    setBusy(true);
    try {
      const fn = httpsCallable<
        { quizId: string; prompt: string },
        { questions: Array<Omit<QuizQuestion, "id">> }
      >(functions, "generateQuizQuestions");
      const res = await fn({ quizId, prompt: aiPrompt.trim() });
      const list = res.data?.questions ?? [];
      setAiPreview(list);
      setSelectedAi(new Set(list.map((_, i) => i)));
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "AI generation failed.";
      setError(msg);
      setAiPreview([]);
    } finally {
      setBusy(false);
    }
  };

  const addAiBatch = async () => {
    setBusy(true);
    setError(null);
    try {
      for (let i = 0; i < aiPreview.length; i++) {
        if (!selectedAi.has(i)) continue;
        await addQuestion(aiPreview[i]!);
      }
      onAdded();
      onClose();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Failed to add some questions.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-gen-title"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="quiz-gen-title" className="text-lg font-semibold text-gray-900">
            Generate questions
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Close
          </button>
        </div>

        <div className="mb-4 flex gap-2 border-b border-gray-200 pb-2">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === "template" ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => setTab("template")}
          >
            Template
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === "ai" ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => setTab("ai")}
          >
            AI
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {tab === "template" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Pick keys and Roman-numeral figures; we build chord-spelling questions with correct
              answers.
            </p>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-800">Keys</p>
              <div className="max-h-36 overflow-y-auto rounded border border-gray-200 p-2">
                <div className="flex flex-wrap gap-2">
                  {keysList.map((k) => (
                    <label key={k} className="flex cursor-pointer items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(k)}
                        onChange={() => toggleKey(k)}
                      />
                      {k}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-800">Chord types</p>
              <div className="flex flex-wrap gap-2">
                {chordsList.map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedChords.has(c)}
                      onChange={() => toggleChord(c)}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            <label className="block text-sm">
              How many questions (max from shuffled combinations)
              <input
                type="number"
                min={1}
                max={50}
                className="mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2"
                value={count}
                onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
              />
            </label>
            <button
              type="button"
              onClick={runTemplatePreview}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
            >
              Preview
            </button>
            {preview.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-800">Preview</p>
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded border border-gray-100 p-2 text-sm">
                  {preview.map((q, i) => {
                    const pl = q.payload as { key?: string; chordLabel?: string };
                    return (
                      <li key={i} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedPreview.has(i)}
                          onChange={() =>
                            setSelectedPreview((prev) => {
                              const n = new Set(prev);
                              if (n.has(i)) n.delete(i);
                              else n.add(i);
                              return n;
                            })
                          }
                        />
                        {pl.key} — {pl.chordLabel}
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  disabled={busy || selectedPreview.size === 0}
                  onClick={addTemplateBatch}
                  className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Add selected to quiz
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "ai" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Describe the quiz you want. The AI returns chord-spelling questions; answers are
              checked against music-theory rules.
            </p>
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. 10 questions mixing V7 and ii6 in major keys up to 4 flats"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || !aiPrompt.trim()}
              onClick={runAi}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50"
            >
              {busy ? "Generating…" : "Generate with AI"}
            </button>
            {aiPreview.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-800">Review</p>
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded border border-gray-100 p-2 text-sm">
                  {aiPreview.map((q, i) => {
                    const pl = q.payload as { key?: string; chordLabel?: string };
                    return (
                      <li key={i} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedAi.has(i)}
                          onChange={() =>
                            setSelectedAi((prev) => {
                              const n = new Set(prev);
                              if (n.has(i)) n.delete(i);
                              else n.add(i);
                              return n;
                            })
                          }
                        />
                        {pl.key} — {pl.chordLabel}
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  disabled={busy || selectedAi.size === 0}
                  onClick={addAiBatch}
                  className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Add selected to quiz
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
