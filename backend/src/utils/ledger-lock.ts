const userLocks = new Map<string, Promise<unknown>>();

/**
 * Serializes ledger mutations and chain recomputations per user within this
 * process so concurrent requests / cron jobs / bots cannot fork `prevLedgerHash`.
 */
export const withUserLedgerLock = async <T>(
  userId: string,
  fn: () => Promise<T>
): Promise<T> => {
  const key = String(userId);
  const previous = userLocks.get(key) ?? Promise.resolve();

  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  const chained = previous.catch(() => undefined).then(() => current);
  userLocks.set(key, chained);

  await previous.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (userLocks.get(key) === chained) {
      userLocks.delete(key);
    }
  }
};
