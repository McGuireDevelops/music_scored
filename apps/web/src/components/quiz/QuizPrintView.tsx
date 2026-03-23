import type { ChordSpellingPayload } from "@learning-scores/shared";
import type { QuizQuestionWithId } from "../../hooks/useQuizzes";
import { summarizeQuestion } from "./questionPayloadDefaults";

function PrintQuestionBody({ q }: { q: QuizQuestionWithId }) {
  switch (q.type) {
    case "chordSpelling": {
      const p = q.payload as ChordSpellingPayload;
      const n = Math.min(12, Math.max(1, Number(p.toneCount) || 1));
      return (
        <div>
          <p>
            In the key of <strong>{p.key}</strong>, spell a <strong>{p.chordLabel}</strong> ({n}{" "}
            {n === 1 ? "note" : "notes"}).
          </p>
          <div className="mt-3 flex flex-wrap gap-6">
            {Array.from({ length: n }, (_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">{i + 1}</span>
                <span className="inline-block min-h-[1.25rem] min-w-[5rem] border-b-2 border-gray-800" />
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "multipleChoiceSingle":
    case "multipleChoiceMulti": {
      const choices = (q.payload as { choices?: Array<{ label?: string; key: string }> }).choices ?? [];
      return (
        <div>
          <p className="text-sm text-gray-800">Select the best answer.</p>
          <ul className="mt-2 list-none space-y-1 pl-0">
            {choices.map((c) => (
              <li key={c.key} className="flex gap-2 text-sm">
                <span className="font-mono">( )</span>
                <span>{c.label || c.key}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "romanNumeral":
    case "nashville":
      return (
        <div>
          <p className="text-sm text-gray-800">Fill in your analysis.</p>
          <div className="mt-2 h-20 border border-dashed border-gray-400" />
        </div>
      );
    case "chordIdentification": {
      const choices =
        (q.payload as {
          choices?: Array<{ chord?: string; key: string; inversion?: string }>;
        }).choices ?? [];
      return (
        <div>
          <p className="text-sm text-gray-800">Identify the chord.</p>
          {q.mediaRef && (
            <p className="text-xs text-gray-500">(Figure attached in the online quiz.)</p>
          )}
          <ul className="mt-2 list-none space-y-1">
            {choices.map((c) => (
              <li key={c.key} className="flex gap-2 text-sm">
                <span className="font-mono">( )</span>
                <span>
                  {c.chord}
                  {c.inversion ? ` (${c.inversion})` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "staffSingleNote":
    case "staffMelody":
      return (
        <div>
          <p className="text-sm text-gray-800">Notate on the staff below.</p>
          <div className="mt-2 h-24 border border-gray-400" />
        </div>
      );
    default:
      return (
        <div>
          <p className="text-sm capitalize text-gray-800">{q.type.replace(/([A-Z])/g, " $1")}</p>
          <p className="text-sm text-gray-600">{summarizeQuestion(q)}</p>
          <div className="mt-2 h-16 border border-dashed border-gray-400" />
        </div>
      );
  }
}

type Props = {
  title: string;
  dateLabel: string;
  questions: QuizQuestionWithId[];
};

export function QuizPrintView({ title, dateLabel, questions }: Props) {
  return (
    <article className="mx-auto max-w-3xl text-gray-900">
      <header className="mb-8 border-b border-gray-400 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-gray-600">{dateLabel}</p>
        <p className="mt-6 text-sm">Name: _________________________________</p>
      </header>
      <ol className="list-decimal space-y-8 pl-6 marker:font-semibold">
        {questions.map((q) => (
          <li key={q.id} className="break-inside-avoid pl-2">
            <PrintQuestionBody q={q} />
          </li>
        ))}
      </ol>
    </article>
  );
}
