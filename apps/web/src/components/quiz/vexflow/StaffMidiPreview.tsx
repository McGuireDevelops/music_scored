import { useEffect, useRef } from "react";
import { Formatter, Renderer, Stave, StaveNote, Voice } from "vexflow";
import { midiToStaveKey } from "./midiToStave";

type Clef = "treble" | "bass";

/**
 * Renders a sequence of MIDI pitches as quarter notes on a staff (read-only).
 */
export function StaffMidiPreview({
  midiNotes,
  clef = "treble",
  width = 440,
}: {
  midiNotes: number[];
  clef?: Clef;
  width?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = "";

    const inner = document.createElement("div");
    host.appendChild(inner);

    const height = 128;
    const renderer = new Renderer(inner, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();

    const stave = new Stave(10, 18, width - 20);
    stave.addClef(clef);
    stave.setContext(context).draw();

    const safe = midiNotes.filter((n) => n >= 0 && n <= 127);
    if (safe.length === 0) return;

    const tickables = safe.map(
      (m) =>
        new StaveNote({
          clef,
          keys: [midiToStaveKey(m)],
          duration: "q",
        })
    );

    const voice = new Voice({
      num_beats: tickables.length,
      beat_value: 4,
    });
    voice.addTickables(tickables);

    new Formatter().joinVoices([voice]).formatToStave([voice], stave);
    voice.draw(context, stave);
  }, [midiNotes, clef, width]);

  return (
    <div
      ref={hostRef}
      className="rounded-lg border border-gray-200 bg-white"
      aria-hidden
    />
  );
}
