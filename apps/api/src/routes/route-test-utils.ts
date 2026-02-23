type MockDbOptions = {
  selectResults?: unknown[];
  insertResults?: unknown[];
  updateResults?: unknown[];
  deleteResults?: unknown[];
};

export function createMockDb(options: MockDbOptions = {}) {
  const selectResults = [...(options.selectResults ?? [])];
  const insertResults = [...(options.insertResults ?? [])];
  const updateResults = [...(options.updateResults ?? [])];
  const deleteResults = [...(options.deleteResults ?? [])];

  const next = (queue: unknown[]) => (queue.length ? queue.shift() : undefined);

  const createQuery = (result: unknown) => {
    const query = Promise.resolve(result) as unknown as {
      from: () => unknown;
      innerJoin: () => unknown;
      leftJoin: () => unknown;
      where: () => unknown;
      limit: () => unknown;
    };

    query.from = () => query;
    query.innerJoin = () => query;
    query.leftJoin = () => query;
    query.where = () => query;
    query.limit = () => query;

    return query;
  };

  const createMutation = (result: unknown) => {
    const mutation = Promise.resolve(result) as unknown as {
      values: () => unknown;
      set: () => unknown;
      where: () => unknown;
      returning: () => Promise<unknown>;
    };

    mutation.values = () => mutation;
    mutation.set = () => mutation;
    mutation.where = () => mutation;
    mutation.returning = () => Promise.resolve(result);

    return mutation;
  };

  return {
    select: () => createQuery(next(selectResults)),
    insert: () => createMutation(next(insertResults)),
    update: () => createMutation(next(updateResults)),
    delete: () => createMutation(next(deleteResults)),
  };
}
