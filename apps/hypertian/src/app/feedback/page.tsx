import { Metadata } from 'next';
import { FeedbackForm } from '@/components/feedback-form';

export const metadata: Metadata = {
  title: 'Feedback',
  description: 'Send a bug report, ad issue, or feature idea to the Hypertian team.',
};

export default function FeedbackPage() {
  return (
    <div className="grid gap-6">
      <header>
        <div className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-accent)]">Feedback</div>
        <h1 className="mt-1 text-3xl font-semibold text-white">Tell us what&rsquo;s broken or missing.</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-copy-soft)]">
          Bug reports and ad issues land in the admin moderation inbox. Optionally drop an email so we can follow up.
        </p>
      </header>
      <FeedbackForm />
    </div>
  );
}
