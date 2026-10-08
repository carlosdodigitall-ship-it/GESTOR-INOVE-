export function Logo({ dark = false }: { dark?: boolean } = {}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-10 w-10 shrink-0 place-items-center">
        <div className="absolute inset-0 rounded-2xl bg-blue-500/25 blur-md" />
        <svg
          viewBox="0 0 128 128"
          className="relative h-10 w-10"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="lc"
              x1="22"
              y1="30"
              x2="104"
              y2="94"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#eff6ff" />
              <stop offset=".45" stopColor="#bfdbfe" />
              <stop offset="1" stopColor="#60a5fa" />
            </linearGradient>
            <linearGradient
              id="lb"
              x1="77"
              y1="40"
              x2="45"
              y2="99"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#93c5fd" />
              <stop offset=".45" stopColor="#3b82f6" />
              <stop offset="1" stopColor="#2563eb" />
            </linearGradient>
            <filter
              id="ls"
              x="10"
              y="18"
              width="108"
              height="94"
              filterUnits="userSpaceOnUse"
            >
              <feDropShadow
                dx="0"
                dy="7"
                stdDeviation="5"
                floodColor="#0f172a"
                floodOpacity=".3"
              />
            </filter>
          </defs>

          <g filter="url(#ls)">
            <path
              d="M31 86c-8 0-14-6-14-14 0-9 7-15 17-15 3-14 14-23 28-23 14 0 25 8 29 21 11-1 20 6 20 16 0 9-7 15-17 15H31Z"
              fill="url(#lc)"
              stroke="#eff6ff"
              strokeWidth="3"
            />
            <path
              d="M75 42 49 72h15l-8 28 29-39H70l5-19Z"
              fill="url(#lb)"
              stroke="#eff6ff"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path
              d="M30 77c9 3 17 4 27 3"
              stroke="#FFFFFF"
              strokeOpacity=".55"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>

      <div>
        <div className={`text-lg font-black tracking-tight ${dark ? "text-white" : "text-slate-950"}`}>
          Cloud<span className="text-blue-500">Zap</span>
        </div>
        <div className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
          CRM · Cobranças · Automação
        </div>
      </div>
    </div>
  );
}
