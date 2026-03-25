export async function fetchList(entity, options = {}) {
  const {
    sort = '-created_date',
    limit = 100,
    max = 1000,
  } = options;

  let allData = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const batch = await entity.list(sort, limit, skip);

    allData = [...allData, ...batch];

    if (batch.length < limit || allData.length >= max) {
      hasMore = false;
    } else {
      skip += limit;
    }
  }

  return allData;
}
