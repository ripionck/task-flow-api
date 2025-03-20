/**
 * Paginate query results
 * @param {Object} model - Mongoose model
 * @param {Object} query - Query object
 * @param {Object} req - Express request object
 * @returns {Object} - Pagination details and query
 */
const paginateResults = async (model, query, req) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await model.countDocuments(query.getQuery());

  // Apply pagination to query
  const paginatedQuery = query.skip(startIndex).limit(limit);

  // Create pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  return {
    query: paginatedQuery,
    pagination,
    total,
    page,
    limit,
  };
};

module.exports = paginateResults;
