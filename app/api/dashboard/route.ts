import { NextRequest } from 'next/server';
import pool from '@/src/lib/db';
import { handleDbError, jsonResponse } from '@/src/lib/api-handler';
import { RowDataPacket } from 'mysql2/promise';

export async function GET(request: NextRequest) {
  try {
    // 1. Total products
    const [pCount] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM products`
    );

    // 2. Total stock value
    const [stockVal] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(stock_qty * cost_price), 0) AS value FROM products`
    );

    // 3. Low stock count (from low_stock_products view)
    const [lowCount] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM low_stock_products`
    );

    // 4. Today's sales
    const [todaySales] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(total_amount), 0) AS total FROM sales WHERE sale_date = CURDATE()`
    );

    // 5. Today's purchases
    const [todayPurchases] = await pool.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(total_amount), 0) AS total FROM purchases WHERE purchase_date = CURDATE()`
    );

    // 6. Low stock preview from view
    const [lowStockItems] = await pool.execute<RowDataPacket[]>(
      `SELECT lsp.*, p.supplier_id 
       FROM low_stock_products lsp
       JOIN products p ON lsp.product_id = p.product_id
       ORDER BY (lsp.reorder_level - lsp.stock_qty) DESC, lsp.stock_qty ASC 
       LIMIT 6`
    );

    // 7. Recent sales from sales_summary view
    const [recentSales] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM sales_summary ORDER BY sale_id DESC LIMIT 6`
    );

    // 8. Sales by category
    const [salesByCategory] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        c.category_name,
        COALESCE(SUM(si.quantity * si.unit_price), 0) AS total_sales
       FROM categories c
       LEFT JOIN products p ON c.category_id = p.category_id
       LEFT JOIN sale_items si ON p.product_id = si.product_id
       GROUP BY c.category_id, c.category_name
       ORDER BY total_sales DESC`
    );

    return jsonResponse({
      totalProducts: Number(pCount[0]?.count || 0),
      totalStockValue: Number(stockVal[0]?.value || 0),
      lowStockCount: Number(lowCount[0]?.count || 0),
      todaySales: Number(todaySales[0]?.total || 0),
      todayPurchases: Number(todayPurchases[0]?.total || 0),
      lowStockItems,
      recentSales,
      salesByCategory,
    });
  } catch (error) {
    return handleDbError(error);
  }
}
