import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="home-outer">
      <header className="home-brand" aria-labelledby="home-title">
        <h1 className="home-display-title" id="home-title">
          <span aria-hidden="true">
            HyperTian<span className="home-blink-x">X</span>
          </span>
          <span className="sr-only">HyperTianX</span>
        </h1>
      </header>

      <nav aria-label="Primary routes" className="home-grid-wrap">
        <div className="home-grid">
          {boxes.map((box) => {
            const isExternal = box.href.startsWith('http');
            if (isExternal) {
              return (
                <a
                  className="home-box"
                  href={box.href}
                  key={box.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <h2 className="home-box-title">{box.title}</h2>
                  <p className="home-box-desc">{box.desc}</p>
                </a>
              );
            }
            return (
              <Link className="home-box" href={box.href} key={box.href}>
                <h2 className="home-box-title">{box.title}</h2>
                <p className="home-box-desc">{box.desc}</p>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

const boxes = [
  {
    href: '/streamer',
    title: 'Streamer',
    desc: 'Create an anonymous stream profile, copy your OBS overlay, and approve banner requests.',
  },
  {
    href: '/directory',
    title: 'Directory',
    desc: 'Browse fresh heartbeat streams and request chart or media placements.',
  },
  {
    href: '/feed',
    title: 'Feed',
    desc: 'Track every ad job and payment with public status cards and receipts.',
  },
  {
    href: '/music',
    title: 'Music',
    desc: 'Play music across the site while the global orb and particles react to sound.',
  },
  {
    href: '/leaderboard',
    title: 'Leaderboard',
    desc: 'View the streamers with highest income & advertisers with the highest spend.',
  },
  {
    href: 'https://hypermyths.com',
    title: 'HyperMythX',
    desc: 'Explore the HyperMyth reality-expansion engine.',
  },
] as const;
