import type { QuizQuestion } from "@learning-scores/shared";
import { chordToMidi, spellChord } from "@learning-scores/shared";

export function buildChordSpellingQuestion(
  key: string,
  chordLabel: string,
  points = 1
): Omit<QuizQuestion, "id"> | null {
  const spelled = spellChord(key, chordLabel);
  const midi = chordToMidi(key, chordLabel, 4);
  if (!spelled?.length || !midi?.length) return null;
  return {
    type: "chordSpelling",
    payload: {
      key,
      chordLabel,
      answerMode: "either",
      toneCount: spelled.length,
      validSpellings: [spelled],
      clef: "treble",
      expectedMidi: midi,
    },
    points,
  };
}
