export async function fetchAllEntities(entityHandler, { sort = '-created_date', limit = 100, max = 5000, query } = {}) {
  const results = [];
  let skip = 0;

  while (results.length < max) {
    const batch = query
      ? await entityHandler.filter(query, sort, limit, skip)
      : await entityHandler.list(sort, limit, skip);

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    results.push(...batch);

    if (batch.length < limit) {
      break;
    }

    skip += limit;
  }

  return results.slice(0, max);
}
