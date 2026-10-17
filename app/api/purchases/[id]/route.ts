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
    const purchaseId = Number(id);
    if (isNaN(purchaseId)) return errorResponse('Invalid purchase ID');

    const [purchaseRows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, s.name AS supplier_name, s.email AS supplier_email, s.phone AS supplier_phone
       FROM purchases p
       JOIN suppliers s ON p.supplier_id = s.supplier_id
       WHERE p.purchase_id = ?`,
      [purchaseId]
    );

    if (purchaseRows.length === 0) return errorResponse('Purchase record not found', 404);

    const [itemRows] = await pool.execute<RowDataPacket[]>(
      `SELECT pi.*, pr.name AS product_name, pr.sku, (pi.quantity * pi.unit_cost) AS subtotal
       FROM purchase_items pi
       JOIN products pr ON pi.product_id = pr.product_id
       WHERE pi.purchase_id = ?
       ORDER BY pi.purchase_item_id ASC`,
      [purchaseId]
    );

    return jsonResponse({
      ...purchaseRows[0],
      items: itemRows,
    });
  } catch (error) {
    return handleDbError(error);
  }
}
