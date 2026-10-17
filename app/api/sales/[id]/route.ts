import { NextRequest } from 'next/server';
import pool from '@/src/lib/db';
import { handleDbError, jsonResponse, errorResponse } from '@/src/lib/api-handler';
import { RowDataPacket } from 'mysql2/promise';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const saleId = Number(id);
    if (isNaN(saleId)) return errorResponse('Invalid sale ID');

    const [saleRows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
       FROM sales s
       JOIN customers c ON s.customer_id = c.customer_id
       WHERE s.sale_id = ?`,
      [saleId]
    );

    if (saleRows.length === 0) return errorResponse('Sale record not found', 404);

    const [itemRows] = await pool.execute<RowDataPacket[]>(
      `SELECT si.*, p.name AS product_name, p.sku, (si.quantity * si.unit_price) AS subtotal
       FROM sale_items si
       JOIN products p ON si.product_id = p.product_id
       WHERE si.sale_id = ?
       ORDER BY si.sale_item_id ASC`,
      [saleId]
    );

    return jsonResponse({
      ...saleRows[0],
      items: itemRows,
    });
  } catch (error) {
    return handleDbError(error);
  }
}
