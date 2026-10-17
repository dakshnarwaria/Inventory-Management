import mysql from 'mysql2/promise';

declare global {
  var mysqlPool: mysql.Pool | undefined;
}

const pool =
  global.mysqlPool ||
  mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'stockpilot',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true, // Parse DECIMAL as JS numbers
  });

if (process.env.NODE_ENV !== 'production') {
  global.mysqlPool = pool;
}

export default pool;
export { pool };

/**
 * Helper to execute a query with automatic connection management
 */
export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T> {
  const [results] = await pool.execute(sql, params);
  return results as T;
}
