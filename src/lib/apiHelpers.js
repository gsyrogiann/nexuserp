export async function fetchList(entity, options = {}) {
  const {
    sort = '-created_date',
    limit = 200,
  } = options;

  return await entity.list(sort, limit);
}
