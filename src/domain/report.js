const RESULT_STATUSES = new Set(['passed', 'failed', 'pending']);

function createReportSnapshot({
  items,
  github = {},
  warnings = [],
  generatedAt = new Date().toISOString(),
}) {
  const snapshotItems = structuredClone(items);
  const counts = {
    total: snapshotItems.length,
    passed: 0,
    failed: 0,
    pending: 0,
  };

  for (const item of snapshotItems) {
    if (!RESULT_STATUSES.has(item.status)) {
      throw new TypeError(`Unsupported report item status "${item.status}".`);
    }
    counts[item.status] += 1;
  }

  const score = counts.total === 0
    ? 0
    : Math.round((counts.passed / counts.total) * 100);
  const status = snapshotItems.some((item) => (
    item.severity === 'blocking' && item.status !== 'passed'
  ))
    ? 'blocked'
    : 'ready';

  return {
    generated_at: generatedAt,
    status,
    score,
    counts,
    github: structuredClone(github),
    warnings: structuredClone(warnings),
    items: snapshotItems,
  };
}

module.exports = {
  createReportSnapshot,
};
