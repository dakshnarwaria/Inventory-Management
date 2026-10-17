import { NextRequest } from 'next/server';
import pool from '@/src/lib/db';
import { handleDbError, jsonResponse, errorResponse } from '@/src/lib/api-handler';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// GET /api/purchases
export async function GET() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        p.purchase_id,
        p.supplier_id,
        p.purchase_date,
        p.total_amount,
        p.status,
        s.name AS supplier_name,
        COUNT(pi.purchase_item_id) AS items_count
       FROM purchases p
       JOIN suppliers s ON p.supplier_id = s.supplier_id
       LEFT JOIN purchase_items pi ON p.purchase_id = pi.purchase_id
       GROUP BY p.purchase_id, p.supplier_id, p.purchase_date, p.total_amount, p.status, s.name
       ORDER BY p.purchase_id DESC`
    );
    return jsonResponse(rows);
  } catch (error) {
    return handleDbError(error);
  }
}

// POST /api/purchases (Single connection transaction)
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { supplier_id, status = 'Received', items } = body;

    // Validation
    if (!supplier_id) {
      connection.release();
      return errorResponse('Supplier is required.');
    }

    const validStatuses = ['Pending', 'Received', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      connection.release();
      return errorResponse(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    if (!Array.isArray(items) || items.length === 0) {
      connection.release();
      return errorResponse('At least one item must be added to the purchase order.');
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.product_id) {
        connection.release();
        return errorResponse(`Line ${i + 1}: Product is required.`);
      }
      const qty = Number(item.quantity);
      if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        connection.release();
        return errorResponse(`Line ${i + 1}: Quantity must be a positive integer.`);
      }
      const cost = Number(item.unit_cost);
      if (isNaN(cost) || cost < 0) {
        connection.release();
        return errorResponse(`Line ${i + 1}: Unit cost must be non-negative.`);
      }
    }

    // Begin transaction
    await connection.beginTransaction();

    // Insert purchase header (total_amount defaults to 0 and will be accumulated by after_purchase_item trigger)
    const [purchaseResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO purchases (supplier_id, purchase_date, status) VALUES (?, CURDATE(), ?)`,
      [Number(supplier_id), status]
    );

    const purchaseId = purchaseResult.insertId;

    // Insert purchase items (after_purchase_item trigger increments stock_qty and total_amount)
    for (const item of items) {
      await connection.execute<ResultSetHeader>(
        `INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost) VALUES (?, ?, ?, ?)`,
        [purchaseId, Number(item.product_id), Number(item.quantity), Number(item.unit_cost)]
      );
    }

    await connection.commit();

    // Fetch the created purchase record
    const [purchaseRows] = await connection.execute<RowDataPacket[]>(
      `SELECT p.*, s.name AS supplier_name 
       FROM purchases p 
       JOIN suppliers s ON p.supplier_id = s.supplier_id 
       WHERE p.purchase_id = ?`,
      [purchaseId]
    );

    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT pi.*, pr.name AS product_name, pr.sku, (pi.quantity * pi.unit_cost) AS subtotal
       FROM purchase_items pi
       JOIN products pr ON pi.product_id = pr.product_id
       WHERE pi.purchase_id = ?`,
      [purchaseId]
    );

    connection.release();

    return jsonResponse(
      {
        ...purchaseRows[0],
        items: itemRows,
      },
      201
    );
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rbErr) {
      console.error('Rollback failed:', rbErr);
    } finally {
      connection.release();
    }
    return handleDbError(error);
  }
}
