import { NextRequest } from 'next/server';
import pool from '@/src/lib/db';
import { handleDbError, jsonResponse, errorResponse } from '@/src/lib/api-handler';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// GET /api/sales
export async function GET() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        s.sale_id,
        s.customer_id,
        s.sale_date,
        s.total_amount,
        s.payment_method,
        c.name AS customer_name,
        COUNT(si.sale_item_id) AS items_count
       FROM sales s
       JOIN customers c ON s.customer_id = c.customer_id
       LEFT JOIN sale_items si ON s.sale_id = si.sale_id
       GROUP BY s.sale_id, s.customer_id, s.sale_date, s.total_amount, s.payment_method, c.name
       ORDER BY s.sale_id DESC`
    );
    return jsonResponse(rows);
  } catch (error) {
    return handleDbError(error);
  }
}

// POST /api/sales (Single connection transaction)
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const { customer_id, payment_method = 'Cash', items } = body;

    // Validation
    if (!customer_id) {
      connection.release();
      return errorResponse('Customer is required.');
    }

    const validMethods = ['Cash', 'Card', 'UPI'];
    if (!validMethods.includes(payment_method)) {
      connection.release();
      return errorResponse(`Invalid payment method. Must be one of: ${validMethods.join(', ')}`);
    }

    if (!Array.isArray(items) || items.length === 0) {
      connection.release();
      return errorResponse('At least one item must be added to the sale.');
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
      const price = Number(item.unit_price);
      if (isNaN(price) || price < 0) {
        connection.release();
        return errorResponse(`Line ${i + 1}: Unit price must be non-negative.`);
      }
    }

    // Begin single-connection transaction
    await connection.beginTransaction();

    // Insert sale header (total_amount defaults to 0 and will be accumulated by MySQL triggers)
    const [saleResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO sales (customer_id, sale_date, payment_method) VALUES (?, CURDATE(), ?)`,
      [Number(customer_id), payment_method]
    );

    const saleId = saleResult.insertId;

    // Insert each sale_item (before_sale_item and after_sale_item triggers handle stock check & subtraction & total_amount)
    for (const item of items) {
      await connection.execute<ResultSetHeader>(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)`,
        [saleId, Number(item.product_id), Number(item.quantity), Number(item.unit_price)]
      );
    }

    // Commit transaction if all lines succeeded
    await connection.commit();

    // Fetch the updated sale record (with trigger-calculated total_amount)
    const [saleRows] = await connection.execute<RowDataPacket[]>(
      `SELECT s.*, c.name AS customer_name 
       FROM sales s 
       JOIN customers c ON s.customer_id = c.customer_id 
       WHERE s.sale_id = ?`,
      [saleId]
    );

    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT si.*, p.name AS product_name, p.sku, (si.quantity * si.unit_price) AS subtotal
       FROM sale_items si
       JOIN products p ON si.product_id = p.product_id
       WHERE si.sale_id = ?`,
      [saleId]
    );

    connection.release();

    const createdSale = {
      ...saleRows[0],
      items: itemRows,
    };

    return jsonResponse(createdSale, 201);
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
