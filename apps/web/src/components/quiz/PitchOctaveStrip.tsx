import { useState } from "react";

const LABELS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;

function midiFrom(pc: number, octave: number): number {
  return (octave + 1) * 12 + pc;
}

type Props = {
  value: number;
  onChange: (midi: number) => void;
  className?: string;
};

/**
 * Chromatic pitch buttons for one octave plus octave shift (interactive staff support).
 */
export function PitchOctaveStrip({ value, onChange, className }: Props) {
  const [octave, setOctave] = useState(() => Math.min(6, Math.max(2, Math.floor(value / 12) - 1)));

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-600">Octave</span>
        <button
          type="button"
          className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
          onClick={() => setOctave((o) => Math.max(2, o - 1))}
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-medium">{octave}</span>
        <button
          type="button"
          className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
          onClick={() => setOctave((o) => Math.min(6, o + 1))}
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {LABELS.map((label, pc) => {
          const m = midiFrom(pc, octave);
          const active = m === value;
          return (
            <button
              key={`${octave}-${pc}`}
              type="button"
              onClick={() => onChange(m)}
              className={`min-w-[2rem] rounded px-2 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-white"
                  : "border border-gray-200 bg-white text-gray-800 hover:border-primary"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
