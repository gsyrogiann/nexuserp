import { reportOperationalEvent } from '@/lib/observability';
import { REQUEST_TIMEOUT_MS, withTimeout } from '@/lib/startup';

export async function fetchList(entity, options = {}) {
  const {
    filter,
    sort = '-created_date',
    limit = 100,
    max = 1000,
    timeoutMs = REQUEST_TIMEOUT_MS,
    entityName = 'entity',
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
  let page = 0;
  const pageLimit = Math.max(1, Math.ceil(max / Math.max(1, limit)) + 1);
  const seenPageSignatures = new Set();

  while (hasMore && page < pageLimit) {
    let batch = [];

    if (hasFilter && typeof entity.filter === 'function') {
      try {
        batch = await withTimeout(
          () => entity.filter(normalizedFilter, sort, limit, skip),
          { timeoutMs, label: `${entityName}.filter` }
        );
      } catch (error) {
        if (skip > 0) {
          throw error;
        }

        const filteredData = await withTimeout(
          () => entity.filter(normalizedFilter, sort),
          { timeoutMs, label: `${entityName}.filter_fallback` }
        );
        batch = filteredData.slice(skip, skip + limit);
      }
    } else {
      batch = await withTimeout(
        () => entity.list(sort, limit, skip),
        { timeoutMs, label: `${entityName}.list` }
      );
    }

    if (!Array.isArray(batch)) {
      batch = [];
    }

    const pageSignature = batch.map((item) => item?.id || item?.key || JSON.stringify(item)).join('|');
    if (pageSignature && seenPageSignatures.has(pageSignature)) {
      reportOperationalEvent('fetch_list_repeated_page', {
        entityName,
        skip,
        limit,
      }, 'warn');
      break;
    }

    if (pageSignature) {
      seenPageSignatures.add(pageSignature);
    }

    allData.push(...batch);
    page += 1;

    if (batch.length === 0 || batch.length < limit || allData.length >= max) {
      hasMore = false;
    } else {
      skip += limit;
    }
  }

  if (hasMore && page >= pageLimit) {
    reportOperationalEvent('fetch_list_page_limit_reached', {
      entityName,
      pageLimit,
      accumulated: allData.length,
      max,
    }, 'warn');
  }

  return allData.slice(0, max);
}
