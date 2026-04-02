export async function fetchList(entity, options = {}) {
  const {
    filter,
    sort = '-created_date',
    limit = 100,
    max = 1000,
  } = options;

  const normalizedFilter = Object.fromEntries(
    Object.entries(filter || {}).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
  );
  const hasFilter = Object.keys(normalizedFilter).length > 0;

  let allData = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    let batch = [];

    if (hasFilter && typeof entity.filter === 'function') {
      try {
        batch = await entity.filter(normalizedFilter, sort, limit, skip);
      } catch (error) {
        if (skip > 0) {
          throw error;
        }

        const filteredData = await entity.filter(normalizedFilter, sort);
        batch = filteredData.slice(skip, skip + limit);
      }
    } else {
      batch = await entity.list(sort, limit, skip);
    }

    allData = [...allData, ...batch];

    if (batch.length < limit || allData.length >= max) {
      hasMore = false;
    } else {
      skip += limit;
    }
  }

  return allData.slice(0, max);
}
