import Link from "next/link";

const boxes = [
  {
    href: "/media",
    num: "01",
    eyebrow: "TRAILER",
    title: "Trailer",
    desc: "Turn a token, X profile, image, or prompt into a short HyperMyths film",
    cta: "Create trailer",
    external: false,
  },
  {
    href: "/chat",
    num: "02",
    eyebrow: "SCANNER",
    title: "Scanner",
    desc: "Scan tokens, read market signals and get a report of any Solana CA",
    cta: "Open scanner",
    external: false,
  },
  {
    href: "/feed",
    num: "03",
    eyebrow: "LIVE",
    title: "Feed",
    desc: "Watch token scans & trailer drops and public signal feeds in realtime",
    cta: "View feed",
    external: false,
  },
  {
    href: "/music",
    num: "04",
    eyebrow: "AUDIO",
    title: "Music",
    desc: "Play local MP3 tracks or Youtube videos with audio-reactive visuals",
    cta: "Open music",
    external: false,
  },
  {
    href: "/creator",
    num: "05",
    eyebrow: "STUDIO",
    title: "Creator Studio",
    desc: "Multi-act creation, saved reports and richer video prompt controls",
    cta: "Enter studio",
    external: false,
  },
  {
    href: "https://hypertian.com",
    num: "06",
    eyebrow: "ADS",
    title: "Hypertian",
    desc: "Creator-owned ad rails for X, livestreams, and memecoin attention markets",
    cta: "hypertian.com",
    external: true,
  },
  {
    href: "https://polymyths.com",
    num: "07",
    eyebrow: "GOV",
    title: "PolyMyths",
    desc: "Governance Layer of the HyperMythX Ecosystem",
    cta: "polymyths.com",
    external: true,
  },
  {
    href: "https://cancerhawk.org",
    num: "08",
    eyebrow: "CAUSE",
    title: "Cancerhawk",
    desc: "Synthetic Data Generation. Run a Research Block with a few words",
    cta: "cancerhawk.org",
    external: true,
  },
];

export default function HomePage() {
  return (
    <div className="home-outer">
      <div className="home-brand">
        <h1 className="home-display-title">
          HyperMyth<span className="home-blink-x">X</span>
        </h1>
      </div>

      <div className="home-grid-wrap">
        <div className="home-grid">
          {boxes.map((box) =>
            box.external ? (
              <a
                key={box.href}
                href={box.href}
                target="_blank"
                rel="noopener noreferrer"
                className="home-box"
                aria-label={box.title}
              >
                <BoxInner box={box} />
              </a>
            ) : (
              <Link key={box.href} href={box.href} className="home-box">
                <BoxInner box={box} />
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function BoxInner({ box }: { box: (typeof boxes)[number] }) {
  return (
    <>
      <h2 className="home-box-title">{box.title}</h2>
      <p className="home-box-desc">{box.desc}</p>
    </>
  );
}
