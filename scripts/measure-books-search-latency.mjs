const baseUrl =
  process.env.BOOKS_SEARCH_URL ??
  'http://localhost:3000/api/v1/books/search';
const iterations = Number(process.env.BOOKS_SEARCH_ITERATIONS ?? 20);
const slaMs = Number(process.env.BOOKS_SEARCH_SLA_MS ?? 2000);

const heavyQueries = [
  '?title=el&author=a&sortBy=relevance&sortOrder=desc&page=1&limit=24',
  '?categoryId=1&minPrice=1000&maxPrice=120000&sortBy=price&sortOrder=asc&page=1&limit=24',
  '?language=Espanol&condition=used&sortBy=publicationYear&sortOrder=desc&page=2&limit=24',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

async function measureQuery(query) {
  const durations = [];

  for (let i = 0; i < iterations; i += 1) {
    const url = `${baseUrl}${query}`;
    const startedAt = performance.now();

    const response = await fetch(url);
    const elapsed = performance.now() - startedAt;

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Request failed (${response.status}) for ${url}: ${responseText.slice(0, 180)}`,
      );
    }

    durations.push(elapsed);

    if (i % 5 === 0) {
      await sleep(30);
    }
  }

  const avg = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  const p95 = percentile(durations, 95);
  const max = Math.max(...durations);

  return {
    query,
    avg,
    p95,
    max,
    passes: p95 <= slaMs,
  };
}

async function main() {
  console.log(`Measuring books search latency against: ${baseUrl}`);
  console.log(`Iterations per query: ${iterations}`);
  console.log(`SLA target (p95): <= ${slaMs} ms`);
  console.log('');

  const results = [];

  for (const query of heavyQueries) {
    // Execute queries sequentially to reduce local machine contention noise.
    const result = await measureQuery(query);
    results.push(result);

    console.log(`Query: ${query}`);
    console.log(`  avg: ${result.avg.toFixed(2)} ms`);
    console.log(`  p95: ${result.p95.toFixed(2)} ms`);
    console.log(`  max: ${result.max.toFixed(2)} ms`);
    console.log(`  status: ${result.passes ? 'PASS' : 'FAIL'}`);
    console.log('');
  }

  const failed = results.filter((item) => !item.passes);
  if (failed.length > 0) {
    console.error('SLA verification failed for one or more heavy queries.');
    process.exit(1);
  }

  console.log('SLA verification passed for all configured heavy queries.');
}

main().catch((error) => {
  console.error('Could not complete latency measurement:', error.message);
  process.exit(1);
});
