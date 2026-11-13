import Link from "next/link";

/* ─── NASA data sources ───────────────────────────────────────── */
const nasaSources = [
  {
    name: "DONKI (Space Weather)",
    url: "https://ccmc.gsfc.nasa.gov/tools/DONKI/",
    desc: "Real solar flare and coronal mass ejection data that drives in-game space weather events.",
  },
  {
    name: "RadLab (Radiation Lab)",
    url: "https://visualization.osdr.nasa.gov/radlab/gui/data-api/",
    desc: "ISS radiation dose measurements used to model how radiation affects your Mars outpost.",
  },
  {
    name: "OSDR (Open Science Data Repository)",
    url: "https://osdr.nasa.gov/bio/",
    desc: "Space biology research that inspires the health and biology facts you see between turns.",
  },
  {
    name: "Mars Rover Photos",
    url: "https://mars.nasa.gov/mars2020/multimedia/raw-images/",
    desc: "Real images from Curiosity, Perseverance, Opportunity, and Spirit that appear as backdrops.",
  },
  {
    name: "APOD (Astronomy Picture of the Day)",
    url: "https://apod.nasa.gov/apod/",
    desc: "Stunning NASA space images used throughout the game for visual inspiration.",
  },
  {
    name: "Mars Trek",
    url: "https://trek.nasa.gov/mars/",
    desc: "Mars terrain and mapping data that informed the game's landscape visuals.",
  },
];

/* ─── How-to-play steps ───────────────────────────────────────── */
const howToPlay = [
  {
    emoji: "🎯",
    title: "Pick Your Difficulty",
    text: "Choose Cadet (easy), Commander (medium), or Pioneer (hard). Each level changes how many resources you start with and how intense the solar storms are.",
  },
  {
    emoji: "☀️",
    title: "Manage Each Sol",
    text: 'Every Mars day (called a "sol") you get to pick one action: repair solar panels, boost oxygen production, reinforce your radiation shields, or do research.',
  },
  {
    emoji: "🌪️",
    title: "Survive Space Weather",
    text: "Random events based on real NASA solar data will test your outpost. A huge solar flare could drain your power — be ready!",
  },
  {
    emoji: "📊",
    title: "Watch Your Resources",
    text: "Keep an eye on three bars: Power ⚡, Oxygen 🫁, and Shielding 🛡️. If any of them hits zero, your mission is over!",
  },
  {
    emoji: "🧠",
    title: "Learn Real Science",
    text: "Between turns you'll see fun facts from NASA about Mars, radiation, and living in space. Real science, made for kids!",
  },
  {
    emoji: "🏆",
    title: "Survive 30 Sols",
    text: "Make it through 30 sols and you win! Your score depends on how healthy your resources are at the end. Can you get 3 stars?",
  },
];

export default function AboutPage() {
  return (
    <>
      <div className="starfield-bg" aria-hidden="true" />

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-16">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-starlight/50 hover:text-starlight transition-colors mb-10 text-sm"
        >
          ← Back to Home
        </Link>

        {/* ── HOW TO PLAY ─────────────────────────── */}
        <section className="mb-20">
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold mb-2">
            How to Play 🎮
          </h1>
          <p className="text-starlight/60 mb-10">
            Everything you need to know to start your Mars mission!
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            {howToPlay.map((step, i) => (
              <div
                key={step.title}
                className="
                  rounded-2xl border border-starlight/10
                  bg-starlight/5 backdrop-blur-sm p-6
                  animate-slide-up
                "
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="text-3xl mb-3 block" aria-hidden="true">
                  {step.emoji}
                </span>
                <h3 className="font-heading text-lg font-bold mb-1">{step.title}</h3>
                <p className="text-starlight/70 text-sm leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── NASA DATA SOURCES ───────────────────── */}
        <section className="mb-20">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-2">
            NASA Data Sources 🛰️
          </h2>
          <p className="text-starlight/60 mb-10">
            This game is powered by real data from these NASA missions and tools.
          </p>

          <div className="flex flex-col gap-5">
            {nasaSources.map((src, i) => (
              <a
                key={src.name}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  group flex items-start gap-4 rounded-2xl border border-starlight/10
                  bg-starlight/5 hover:border-o2-blue/40 hover:bg-o2-blue/5
                  backdrop-blur-sm p-5 transition-all duration-200
                  animate-slide-up
                "
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="flex-shrink-0 w-3 h-3 mt-1.5 rounded-full bg-shield-green group-hover:bg-o2-blue transition-colors" />
                <div>
                  <h3 className="font-heading font-bold text-base group-hover:text-o2-blue transition-colors">
                    {src.name}
                    <span className="ml-2 text-starlight/30 text-xs">↗</span>
                  </h3>
                  <p className="text-starlight/60 text-sm leading-relaxed mt-1">{src.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── CREDITS ─────────────────────────────── */}
        <section className="rounded-3xl border border-starlight/10 bg-starlight/5 backdrop-blur-sm p-8 md:p-10 text-center animate-slide-up">
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-4">
            🌍 About This Project
          </h2>
          <p className="text-starlight/70 leading-relaxed max-w-2xl mx-auto mb-4">
            <strong className="text-mars-orange">Junior Astronaut Mission Trainer</strong> was
            built for the{" "}
            <strong className="text-o2-blue">NASA International Space Apps Challenge 2026</strong>,
            the world&apos;s largest annual global hackathon. The challenge is
            organized by NASA in collaboration with the{" "}
            <strong className="text-starlight">Canadian Space Agency (CSA)</strong>,
            space agencies, and partners around the globe.
          </p>
          <p className="text-starlight/50 text-sm">
            All game data is derived from publicly available NASA Open Data sources.
            This project is not affiliated with or endorsed by NASA.
          </p>

          <div className="mt-8 flex justify-center gap-6 flex-wrap">
            <Link
              href="/"
              className="
                inline-flex items-center gap-2 px-6 py-3 rounded-xl
                border border-starlight/20 text-sm font-semibold
                hover:bg-starlight/10 transition-colors
              "
            >
              ← Home
            </Link>
            <Link
              href="/game"
              className="
                inline-flex items-center gap-2 px-6 py-3 rounded-xl
                bg-gradient-to-r from-mars-orange to-cosmic-purple
                text-white text-sm font-bold
                hover:scale-105 transition-transform
              "
            >
              Play Now 🚀
            </Link>
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────── */}
        <footer className="mt-16 pt-8 border-t border-starlight/10 text-center text-xs text-starlight/30">
          <p>
            NASA Space Apps Challenge 2026 · Built with Next.js, TypeScript &amp; Tailwind CSS
          </p>
          <p className="mt-1">
            In collaboration with the Canadian Space Agency (CSA)
          </p>
        </footer>
      </main>
    </>
  );
}
