import Link from "next/link";

/* ─── Feature cards ───────────────────────────────────────────── */
const features = [
  {
    emoji: "⚡",
    title: "Power Systems",
    desc: "Manage solar panels and batteries to keep your outpost running. Solar storms can knock them offline!",
    color: "border-mars-orange",
    glow: "shadow-mars-orange/20",
  },
  {
    emoji: "🫁",
    title: "Oxygen Supply",
    desc: "Run the electrolyzers and patch leaks before the air runs out. Every breath counts on Mars!",
    color: "border-o2-blue",
    glow: "shadow-o2-blue/20",
  },
  {
    emoji: "🛡️",
    title: "Radiation Shielding",
    desc: "Build shields and find shelter when the Sun throws a tantrum. Real NASA radiation data powers every event!",
    color: "border-shield-green",
    glow: "shadow-shield-green/20",
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
  { name: "DONKI", label: "Solar Events" },
  { name: "RadLab", label: "Radiation Data" },
  { name: "OSDR", label: "Space Biology" },
  { name: "Mars Rover Photos", label: "Mars Imagery" },
  { name: "APOD", label: "Astronomy Pictures" },
  { name: "Mars Trek", label: "Mars Terrain" },
];

export default function HomePage() {
  return (
    <>
      {/* Starfield background */}
      <div className="starfield-bg" aria-hidden="true" />

      <main className="relative z-10 flex flex-col">
        {/* ───────── HERO ───────── */}
        <section className="flex flex-col items-center justify-center min-h-[90vh] px-4 text-center gap-6">
          {/* Floating rocket */}
          <span className="text-6xl md:text-8xl animate-float" aria-hidden="true">
            🚀
          </span>

          <h1 className="font-heading text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-tight animate-fade-in">
            <span className="text-mars-orange">Junior Astronaut</span>
            <br />
            <span className="bg-gradient-to-r from-o2-blue via-cosmic-purple to-mars-orange bg-clip-text text-transparent">
              Mission Trainer
            </span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-starlight/80 max-w-2xl animate-fade-in [animation-delay:200ms]">
            Can you survive <span className="font-bold text-mars-orange">30 sols</span> on Mars?
            <br className="hidden sm:block" />
            Manage power, oxygen &amp; shielding using{" "}
            <span className="text-o2-blue font-semibold">real NASA data</span>.
          </p>

          {/* CTA */}
          <Link
            href="/game"
            className="
              mt-4 inline-flex items-center gap-3
              px-10 py-5 rounded-2xl
              bg-gradient-to-r from-mars-orange to-cosmic-purple
              text-white font-heading font-bold text-xl md:text-2xl
              animate-glow-pulse hover:scale-105
              transition-transform duration-200
              focus:outline-none focus:ring-4 focus:ring-mars-orange/50
              animate-fade-in [animation-delay:400ms]
            "
          >
            Start Mission
            <span className="text-2xl" aria-hidden="true">🛸</span>
          </Link>

          {/* Scroll hint */}
          <div className="mt-12 animate-float [animation-delay:1s] text-starlight/40 text-sm">
            ↓ Scroll to learn more
          </div>
        </section>

        {/* ───────── FEATURE CARDS ───────── */}
        <section className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-14">
            Three Resources. One Mission.{" "}
            <span className="text-mars-orange">Zero Margin for Error.</span>
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
        <section className="max-w-4xl mx-auto px-4 py-20">
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
                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-cosmic-purple/30 border border-cosmic-purple flex items-center justify-center text-3xl">
                  {s.icon}
                </div>
                <div>
                  <p className="text-cosmic-purple font-mono text-sm font-bold tracking-widest mb-1">
                    STEP {s.num}
                  </p>
                  <h3 className="font-heading text-xl font-bold mb-1">{s.title}</h3>
                  <p className="text-starlight/70 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ───────── NASA DATA SOURCES ───────── */}
        <section className="max-w-5xl mx-auto px-4 py-20 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Powered by{" "}
            <span className="text-o2-blue">Real NASA Data</span> 🛰️
          </h2>
          <p className="text-starlight/60 mb-10 max-w-2xl mx-auto">
            Every solar storm, radiation reading, and Mars fact comes from
            actual NASA missions and instruments.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {dataSources.map((d) => (
              <span
                key={d.name}
                className="
                  inline-flex items-center gap-2 px-5 py-2.5
                  rounded-full border border-starlight/20
                  bg-starlight/5 backdrop-blur-sm
                  text-sm font-medium text-starlight/90
                  hover:border-o2-blue hover:text-o2-blue
                  transition-colors duration-200
                "
              >
                <span className="w-2 h-2 rounded-full bg-shield-green" aria-hidden="true" />
                {d.name}
                <span className="text-starlight/40 hidden sm:inline">— {d.label}</span>
              </span>
            ))}
          </div>
        </section>

        {/* ───────── FOOTER ───────── */}
        <footer className="border-t border-starlight/10 py-10 text-center text-sm text-starlight/40">
          <p className="mb-2">
            Built for{" "}
            <span className="text-mars-orange font-semibold">
              NASA Space Apps Challenge 2026
            </span>
          </p>
          <p>
            Data provided by NASA Open APIs · Not affiliated with or endorsed by NASA
          </p>
          <div className="mt-4 flex justify-center gap-6">
            <Link
              href="/about"
              className="text-starlight/60 hover:text-starlight transition-colors"
            >
              About &amp; Sources
            </Link>
            <Link
              href="/game"
              className="text-mars-orange hover:text-mars-orange/80 transition-colors font-semibold"
            >
              Play Now →
            </Link>
          </div>
        </footer>
      </main>
    </>
  );
}
