import { NextRequest } from 'next/server';
import pool from '@/src/lib/db';
import { handleDbError, jsonResponse, errorResponse } from '@/src/lib/api-handler';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// GET /api/categories
export async function GET() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.category_id, c.category_name, c.description, COUNT(p.product_id) AS products_count
       FROM categories c
       LEFT JOIN products p ON c.category_id = p.category_id
       GROUP BY c.category_id, c.category_name, c.description
       ORDER BY c.category_name ASC`
    );
    return jsonResponse(rows);
  } catch (error) {
    return handleDbError(error);
  }
}

// POST /api/categories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category_name, description } = body;

    if (!category_name || !category_name.trim()) {
      return errorResponse('Category name is required.');
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO categories (category_name, description) VALUES (?, ?)`,
      [category_name.trim(), description?.trim() || null]
    );

    const [newRow] = await pool.execute<RowDataPacket[]>(
      `SELECT *, 0 AS products_count FROM categories WHERE category_id = ?`,
      [result.insertId]
    );

    return jsonResponse(newRow[0], 201);
  } catch (error) {
    return handleDbError(error);
  }
}
