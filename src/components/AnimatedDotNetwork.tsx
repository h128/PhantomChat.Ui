const nodes = [
  { id: "n1", x: 6, y: 18, size: 0.8, delay: "0s" },
  { id: "n2", x: 16, y: 30, size: 1.05, delay: "0.8s" },
  { id: "n3", x: 28, y: 22, size: 0.9, delay: "1.5s" },
  { id: "n4", x: 38, y: 34, size: 1.2, delay: "0.4s" },
  { id: "n5", x: 52, y: 20, size: 0.85, delay: "1.1s" },
  { id: "n6", x: 63, y: 30, size: 1, delay: "2.1s" },
  { id: "n7", x: 76, y: 18, size: 1.15, delay: "0.9s" },
  { id: "n8", x: 88, y: 28, size: 0.82, delay: "1.8s" },
  { id: "n9", x: 12, y: 48, size: 1.12, delay: "2.4s" },
  { id: "n10", x: 24, y: 58, size: 0.92, delay: "1.2s" },
  { id: "n11", x: 36, y: 50, size: 1.18, delay: "0.6s" },
  { id: "n12", x: 48, y: 64, size: 0.86, delay: "2.6s" },
  { id: "n13", x: 61, y: 52, size: 1.12, delay: "1.4s" },
  { id: "n14", x: 74, y: 62, size: 0.94, delay: "2s" },
  { id: "n15", x: 86, y: 50, size: 0.98, delay: "1.7s" },
  { id: "n16", x: 20, y: 80, size: 0.78, delay: "2.2s" },
  { id: "n17", x: 42, y: 84, size: 0.96, delay: "0.3s" },
  { id: "n18", x: 68, y: 82, size: 1.06, delay: "1.9s" },
  { id: "n19", x: 90, y: 76, size: 0.86, delay: "2.8s" },
] as const;

const links = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [1, 8],
  [2, 9],
  [3, 10],
  [4, 10],
  [4, 11],
  [5, 12],
  [6, 13],
  [7, 14],
  [8, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [12, 13],
  [13, 14],
  [9, 15],
  [10, 16],
  [11, 16],
  [12, 17],
  [13, 17],
  [14, 18],
  [15, 16],
  [16, 17],
  [17, 18],
] as const;

export function AnimatedDotNetwork() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/10 blur-3xl sm:h-[52rem] sm:w-[52rem]" />
      <div className="absolute inset-x-0 top-0 h-60 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.18),transparent_68%)]" />

      <svg
        className="network-grid absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <g>
          {links.map(([from, to], index) => {
            const start = nodes[from];
            const end = nodes[to];

            return (
              <line
                key={`${start.id}-${end.id}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                className="network-line"
                style={{ animationDelay: `${index * 0.28}s` }}
              />
            );
          })}
        </g>

        <g>
          {nodes.map((node) => (
            <g
              key={node.id}
              className="network-node"
              style={{ animationDelay: node.delay }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={node.size * 3}
                className="network-node-halo"
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={node.size}
                className="network-node-core"
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
