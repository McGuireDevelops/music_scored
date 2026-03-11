import { describe, it, expect } from "vitest";
import { darkenHex } from "./color";

describe("darkenHex", () => {
  it("darkens a hex color by the given factor", () => {
    expect(darkenHex("#6366F1", 0.15)).not.toBe("#6366F1");
    expect(darkenHex("#6366F1", 0.15).startsWith("#")).toBe(true);
    expect(darkenHex("#6366F1", 0.15)).toHaveLength(7);
  });

  it("handles hex with # prefix", () => {
    const result = darkenHex("#ffffff", 0.1);
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    expect(result).not.toBe("#ffffff");
  });

  it("returns darker color for higher factor", () => {
    const light = darkenHex("#6366F1", 0.05);
    const dark = darkenHex("#6366F1", 0.5);
    const lightSum = parseInt(light.slice(1), 16);
    const darkSum = parseInt(dark.slice(1), 16);
    expect(darkSum).toBeLessThan(lightSum);
  });

  it("returns same format as input", () => {
    const result = darkenHex("#000000", 0.2);
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
