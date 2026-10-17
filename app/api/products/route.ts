import { NextRequest } from 'next/server';
import pool from '@/src/lib/db';
import { handleDbError, jsonResponse, errorResponse } from '@/src/lib/api-handler';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// GET /api/products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const categoryId = searchParams.get('category_id');

    let sql = `
      SELECT 
        p.product_id,
        p.sku,
        p.name,
        p.category_id,
        p.supplier_id,
        p.cost_price,
        p.selling_price,
        p.stock_qty,
        p.reorder_level,
        c.category_name,
        s.name AS supplier_name
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      JOIN suppliers s ON p.supplier_id = s.supplier_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sql += ` AND (p.name LIKE ? OR p.sku LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (categoryId && categoryId !== 'all') {
      sql += ` AND p.category_id = ?`;
      params.push(Number(categoryId));
    }

    sql += ` ORDER BY p.product_id ASC`;

    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
    return jsonResponse(rows);
  } catch (error) {
    return handleDbError(error);
  }
}

// POST /api/products
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sku, name, category_id, supplier_id, cost_price, selling_price, stock_qty = 0, reorder_level = 10 } = body;

    // Validation
    if (!sku || !sku.trim()) return errorResponse('SKU is required.');
    if (!name || !name.trim()) return errorResponse('Product name is required.');
    if (!category_id) return errorResponse('Category is required.');
    if (!supplier_id) return errorResponse('Supplier is required.');

    const numCost = Number(cost_price);
    const numPrice = Number(selling_price);
    const numStock = Number(stock_qty);
    const numReorder = Number(reorder_level);

    if (isNaN(numCost) || numCost < 0) return errorResponse('Cost price must be a non-negative number.');
    if (isNaN(numPrice) || numPrice < 0) return errorResponse('Selling price must be a non-negative number.');
    if (isNaN(numStock) || numStock < 0) return errorResponse('Stock quantity cannot be negative.');
    if (isNaN(numReorder) || numReorder < 0) return errorResponse('Reorder level cannot be negative.');

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO products (sku, name, category_id, supplier_id, cost_price, selling_price, stock_qty, reorder_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sku.trim().toUpperCase(), name.trim(), Number(category_id), Number(supplier_id), numCost, numPrice, numStock, numReorder]
    );

    const [newRow] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, c.category_name, s.name AS supplier_name 
       FROM products p 
       JOIN categories c ON p.category_id = c.category_id 
       JOIN suppliers s ON p.supplier_id = s.supplier_id 
       WHERE p.product_id = ?`,
      [result.insertId]
    );

    return jsonResponse(newRow[0], 201);
  } catch (error) {
    return handleDbError(error);
  }
}
