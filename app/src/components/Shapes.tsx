// Decorative solid-colour shapes (no gradients), modelled on the reference's organic blobs.

export function CornerBlob({ tone }: { tone: "yellow" | "red" }) {
  const c = tone === "yellow" ? ["#ffd23f", "#fff3c4", "#ffe68a"] : ["#ffc2b8", "#eb3b2e", "#ffe1da"];
  return (
    <svg className="blob-art" viewBox="0 0 200 180" aria-hidden>
      <path fill={c[0]} d="M58 0 C36 34 72 58 52 90 C34 120 74 146 114 134 C150 124 164 164 200 156 L200 0 Z" />
      <path fill={c[1]} d="M92 0 C78 26 102 46 90 72 C78 98 108 112 138 104 C166 96 176 124 200 118 L200 0 Z" />
      <path fill={c[2]} d="M122 0 C112 20 130 36 122 56 C114 76 136 86 158 80 C178 74 186 92 200 88 L200 0 Z" />
    </svg>
  );
}

/** Topographic contour lines for the red cards. */
export function Topo({ color = "#f2655a" }: { color?: string }) {
  const lines = Array.from({ length: 11 }, (_, k) => {
    const y = -20 + k * 26;
    return `M-30 ${y + 30} C 50 ${y - 10}, 110 ${y + 70}, 190 ${y + 24} S 330 ${y - 20}, 430 ${y + 40}`;
  });
  return (
    <svg className="topo" viewBox="0 0 400 260" preserveAspectRatio="none" aria-hidden>
      {lines.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
      ))}
      <ellipse cx="320" cy="210" rx="60" ry="34" fill="none" stroke={color} strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
      <ellipse cx="320" cy="210" rx="34" ry="18" fill="none" stroke={color} strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Two little solid shapes peeking into a black icon tile. */
export function TileBlobs() {
  return (
    <svg className="blobs" viewBox="0 0 52 52" aria-hidden>
      <circle cx="44" cy="6" r="13" fill="#ffd23f" />
      <circle cx="4" cy="50" r="15" fill="#eb3b2e" />
    </svg>
  );
}
