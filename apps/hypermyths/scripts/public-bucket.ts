import { db } from '../lib/db';

async function run() {
  // Check current state
  const before = await db.$queryRaw<{name:string,public:boolean}[]>`
    SELECT name, public FROM storage.buckets WHERE name = 'videos'
  `;
  console.log('Before:', before);

  // Make it public
  await db.$executeRaw`
    UPDATE storage.buckets SET public = true WHERE name = 'videos'
  `;

  const after = await db.$queryRaw<{name:string,public:boolean}[]>`
    SELECT name, public FROM storage.buckets WHERE name = 'videos'
  `;
  console.log('After:', after);
}

run().catch(e => { console.error(e.message); process.exit(1); });
