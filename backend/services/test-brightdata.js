/**
 * test-brightdata.js
 * Run this FIRST, before anything else: `node test-brightdata.js`
 *
 * Talks to Bright Data directly — no Express, no store, no React.
 * If this doesn't work, nothing built on top of it will either, so
 * fix this before touching any other file.
 *
 * Requires BRIGHTDATA_API_KEY and BRIGHTDATA_COLLECTOR_ID to be set
 * (either in your real environment, or via a .env loader if you use
 * one — this script reads process.env directly, so `node -r dotenv/config
 * test-brightdata.js` or export them in your shell first).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { runCollector, isStudioConfigured } = require('./brightdata');

async function main() {
  console.log('--- Bright Data Scraper Studio connectivity test ---\n');

  if (!isStudioConfigured()) {
    console.error('❌ Missing BRIGHTDATA_API_KEY or BRIGHTDATA_COLLECTOR_ID.');
    console.error('   Set both, then re-run this script.');
    process.exit(1);
  }

  const testUrl = 'https://www.nike.com.in/';
  console.log(`Triggering collector for: ${testUrl}`);
  console.log('(this can take anywhere from ~30s to a few minutes — be patient)\n');

  const start = Date.now();
  try {
    const data = await runCollector(testUrl);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log(`✅ Got a response after ${elapsed}s\n`);
    console.log('Type of result:', Array.isArray(data) ? `array (${data.length} items)` : typeof data);
    console.log('\nFirst item (raw, so you can see the actual field names Bright Data returns):');
    console.log(JSON.stringify(Array.isArray(data) ? data[0] : data, null, 2));

    if (Array.isArray(data) && data.length === 0) {
      console.warn('\n⚠️  Array came back EMPTY. The API call worked but the collector found nothing —');
      console.warn('   check the Parser code / Runs tab on the Bright Data dashboard for that run.');
    }
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`\n❌ Failed after ${elapsed}s:`, err.message);
    console.error('\nIf this is a 404 or 401, the trigger endpoint/auth shape is wrong — open the');
    console.error('API-access icon next to "Active scraper" on your collector\'s dashboard page and');
    console.error('compare its example request to triggerCollector() in brightdata.js.');
  }
}

main();