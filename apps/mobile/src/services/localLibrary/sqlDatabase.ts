/**
 * The subset of expo-sqlite's `SQLiteDatabase` the local Library uses.
 * expo-sqlite satisfies it structurally, so production passes the real
 * database directly; tests run the same SQL through Node's built-in SQLite.
 */
export type SqlValue = string | number | null;

export interface LocalSqlExecutor {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<unknown>;
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>;
}

export interface LocalSqlDatabase extends LocalSqlExecutor {
  withExclusiveTransactionAsync(
    task: (transaction: LocalSqlExecutor) => Promise<void>,
  ): Promise<void>;
}
