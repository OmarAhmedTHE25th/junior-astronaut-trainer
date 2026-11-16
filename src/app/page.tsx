import Link from "next/link";
import MainMenu from "@/components/game/MainMenu";

/* ─── Feature cards ───────────────────────────────────────────── */
const features = [
  {
    emoji: "⚡",
    title: "Power Systems",
    desc: "Manage solar panels and batteries to keep your outpost running. Solar storms can knock them offline!",
    color: "border-amber-400/50",
    glow: "shadow-amber-500/10",
  },
  {
    emoji: "🫁",
    title: "Oxygen Supply",
    desc: "Run the electrolyzers and patch leaks before the air runs out. Every breath counts on Mars!",
    color: "border-cyan-400/50",
    glow: "shadow-cyan-500/10",
  },
  {
    emoji: "🛡️",
    title: "Radiation Shielding",
    desc: "Build shields and find shelter when the Sun throws a tantrum. Real NASA radiation data powers every event!",
    color: "border-emerald-400/50",
    glow: "shadow-emerald-500/10",
  },
];

/* ─── How-it-works steps ──────────────────────────────────────── */
const steps = [
  {
    num: "01",
    title: "Choose Your Difficulty",
    desc: "Pick Cadet (easy), Commander (medium), or Pioneer (hard) and launch your mission!",
    icon: "🎯",
  },
  {
    num: "02",
    title: "Make Decisions Each Sol",
    desc: "Every Mars day (sol) brings new choices — repair solar panels, boost oxygen, or reinforce shields.",
    icon: "🧠",
  },
  {
    num: "03",
    title: "Survive 30 Sols",
    desc: "Face real NASA solar flare data and space radiation events. Keep your crew alive to win!",
    icon: "🏆",
  },
];

/* ─── NASA data sources ───────────────────────────────────────── */
const dataSources = [
  { name: "DONKI", label: "Solar Events", url: "https://ccmc.gsfc.nasa.gov/tools/DONKI/" },
  { name: "RadLab", label: "Radiation Data", url: "https://visualization.osdr.nasa.gov/radlab/gui/data-api/" },
  { name: "OSDR", label: "Space Biology", url: "https://osdr.nasa.gov/bio/repo/" },
  { name: "NASA Image & Video Library", label: "Planetary Imagery", url: "https://images.nasa.gov/" },
  { name: "APOD", label: "Astronomy Pictures", url: "https://api.nasa.gov/" },
  { name: "JPL Horizons / Solar System Treks", label: "Orbital & Terrain Telemetry", url: "https://trek.nasa.gov/" },
];

export default function HomePage() {
  return (
    <>
      {/* Starfield background */}
      <div className="starfield-bg" aria-hidden="true" />

      <main className="relative z-10 flex flex-col min-h-screen">
        {/* ───────── COMMAND CENTER HEADER & MAIN MENU ───────── */}
        <MainMenu />

        {/* ───────── HERO SECTION ───────── */}
        <section className="flex flex-col items-center justify-center px-4 pt-6 pb-16 text-center gap-6">
          {/* Floating rocket */}
          <span className="text-6xl md:text-8xl animate-float" aria-hidden="true">
            🚀
          </span>

          <h1 className="font-heading text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-tight animate-fade-in">
            <span className="text-white">Junior Astronaut</span>
            <br />
            <span className="text-cyan-400 font-extrabold tracking-tight">
              Mission Trainer
            </span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-starlight/80 max-w-2xl animate-fade-in [animation-delay:200ms]">
            Can you survive <span className="font-bold text-cyan-300">30 sols</span> on Mars?
            <br className="hidden sm:block" />
            Manage power, oxygen &amp; shielding using{" "}
            <span className="text-cyan-400 font-semibold">real NASA data</span>.
          </p>

          {/* Quick Start Mission Button */}
          <Link
            href="/game"
            className="
              mt-2 inline-flex items-center gap-3
              px-10 py-5 rounded-2xl
              bg-cyan-400 hover:bg-cyan-300
              text-slate-950 font-heading font-extrabold text-xl md:text-2xl
              border border-cyan-200
              animate-glow-pulse hover:scale-105
              transition-transform duration-200
              focus:outline-none focus:ring-4 focus:ring-cyan-400/50
              animate-fade-in [animation-delay:400ms] shadow-xl
            "
          >
            Launch Sol 1
            <span className="text-2xl" aria-hidden="true">🛸</span>
          </Link>
        </section>

        {/* ───────── FEATURE CARDS ───────── */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-14 text-white">
            Three Resources. One Mission.{" "}
            <span className="text-cyan-400">Zero Margin for Error.</span>
          </h2>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`
                  relative rounded-2xl border-2 ${f.color}
                  bg-space-navy/80 backdrop-blur-sm
                  p-8 flex flex-col gap-4
                  shadow-xl ${f.glow}
                  animate-slide-up
                  hover:scale-[1.03] transition-transform duration-200
                `}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <span className="text-5xl" aria-hidden="true">{f.emoji}</span>
                <h3 className="font-heading text-2xl font-bold">{f.title}</h3>
                <p className="text-starlight/70 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ───────── HOW IT WORKS ───────── */}
        <section className="max-w-4xl mx-auto px-4 py-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-14">
            How It Works
          </h2>

          <div className="flex flex-col gap-10">
            {steps.map((s, i) => (
              <div
                key={s.num}
                className="flex items-start gap-6 animate-slide-up"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-3xl">
                  {s.icon}
                </div>
                <div>
                  <p className="text-cyan-400 font-mono text-sm font-bold tracking-widest mb-1">
                    STEP {s.num}
                  </p>
                  <h3 className="font-heading text-xl font-bold mb-2 text-white">{s.title}</h3>
                  <p className="text-starlight/70 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ───────── REAL NASA DATA SOURCES ───────── */}
        <section className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4 text-white">
            Powered by <span className="text-cyan-400">Real NASA Data</span>
          </h2>
          <p className="text-starlight/60 max-w-xl mx-auto mb-10">
            No invented numbers. Every solar flare, radiation reading, and biological effect is modeled after real open NASA research.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {dataSources.map((ds) => (
              <a
                key={ds.name}
                href={ds.url}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  flex flex-col items-center justify-center p-4 rounded-xl
                  border border-slate-700/60 bg-[#111827]/80 backdrop-blur-sm
                  hover:border-cyan-400/60 hover:scale-105 transition-all duration-200
                  group
                "
              >
                <span className="font-heading font-bold text-lg text-slate-100 group-hover:text-cyan-400 transition-colors">
                  {ds.name}
                </span>
                <span className="text-xs text-slate-400 mt-1">{ds.label}</span>
              </a>
            ))}
          </div>
        </section>

        {/* ───────── FOOTER ───────── */}
        <footer className="border-t border-slate-800 bg-[#090D16]/95 backdrop-blur-md py-10 px-4 text-center text-sm text-slate-400">
          <p>
            Built for the{" "}
            <span className="text-cyan-400 font-semibold">
              NASA Space Apps Challenge 2026
            </span>
          </p>
          <p className="mt-1">
            Challenge: Junior Astronaut Mission Trainer • Space Agency Partner: Canadian Space Agency (CSA)
          </p>
          <div className="mt-4 flex justify-center gap-6 text-slate-300">
            <Link href="/about" className="hover:text-cyan-400 transition-colors">
              About &amp; NASA Science Credits
            </Link>
            <span>•</span>
            <Link href="/game" className="hover:text-cyan-400 transition-colors">
              Play Game
            </Link>
          </div>
        </footer>
      </main>
    </>
  );
}
