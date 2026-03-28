import 'dotenv/config';
import { prefetchAccessDatabase, loadAccessConfig } from '../config/access.js';

async function main() {
  await prefetchAccessDatabase();
  const cfg = loadAccessConfig();
  console.log('OK: free vless count =', cfg.vless.free.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
