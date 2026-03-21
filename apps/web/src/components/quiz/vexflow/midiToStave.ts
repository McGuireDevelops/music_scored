/** MIDI note number to VexFlow StaveNote key (e.g. 60 → "c/4"). Uses sharps for accidentals. */
export function midiToStaveKey(midi: number): string {
  const names = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"] as const;
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${names[pc]}/${octave}`;
}
