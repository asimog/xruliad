import { db } from '../lib/db';
const jobId = process.argv[2];
if (!jobId) { console.error('need jobId'); process.exit(1); }
async function run() {
  const r = await db.job.update({ where: { jobId }, data: { paymentWaived: true } });
  console.log('waived:', r.jobId, r.paymentWaived);
}
run().catch(e => { console.error(e.message); process.exit(1); });
