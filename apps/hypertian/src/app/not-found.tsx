import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="panel mx-auto flex min-h-[55vh] max-w-3xl flex-col items-start justify-center rounded-[36px] p-8 md:p-10">
      <div className="eyebrow">Page not found</div>
      <h1 className="mt-6 text-4xl font-semibold text-white md:text-6xl">
        This page is off air.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-copy-soft)]">
        Return to Hypertian to explore sponsor inventory and creator tools.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="primary-button" href="/">
          Return home
        </Link>
        <Link className="secondary-button" href="/dashboard/streamer">
          Creator Studio
        </Link>
      </div>
    </div>
  );
}
