import { NextRequest } from 'next/server';
import pool from '@/src/lib/db';
import { handleDbError, jsonResponse } from '@/src/lib/api-handler';
import { RowDataPacket } from 'mysql2/promise';

export async function GET(request: NextRequest) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        lsp.product_id,
        lsp.sku,
        lsp.name,
        lsp.category_name,
        lsp.supplier,
        lsp.stock_qty,
        lsp.reorder_level,
        p.supplier_id,
        p.cost_price,
        p.selling_price,
        (lsp.reorder_level - lsp.stock_qty) AS deficit
       FROM low_stock_products lsp
       JOIN products p ON lsp.product_id = p.product_id
       ORDER BY deficit DESC, lsp.stock_qty ASC`
    );

    return jsonResponse(rows);
  } catch (error) {
    return handleDbError(error);
  }
}
