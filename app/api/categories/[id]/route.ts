import { NextRequest } from 'next/server';
import pool from '@/src/lib/db';
import { handleDbError, jsonResponse, errorResponse } from '@/src/lib/api-handler';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const categoryId = Number(id);
    if (isNaN(categoryId)) return errorResponse('Invalid category ID');

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*, COUNT(p.product_id) AS products_count 
       FROM categories c
       LEFT JOIN products p ON c.category_id = p.category_id
       WHERE c.category_id = ?
       GROUP BY c.category_id`,
      [categoryId]
    );

    if (rows.length === 0) return errorResponse('Category not found', 404);
    return jsonResponse(rows[0]);
  } catch (error) {
    return handleDbError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const categoryId = Number(id);
    if (isNaN(categoryId)) return errorResponse('Invalid category ID');

    const body = await request.json();
    const { category_name, description } = body;

    if (!category_name || !category_name.trim()) {
      return errorResponse('Category name is required.');
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE categories SET category_name = ?, description = ? WHERE category_id = ?`,
      [category_name.trim(), description?.trim() || null, categoryId]
    );

    if (result.affectedRows === 0) {
      return errorResponse('Category not found', 404);
    }

    const [updatedRow] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*, COUNT(p.product_id) AS products_count 
       FROM categories c
       LEFT JOIN products p ON c.category_id = p.category_id
       WHERE c.category_id = ?
       GROUP BY c.category_id`,
      [categoryId]
    );

    return jsonResponse(updatedRow[0]);
  } catch (error) {
    return handleDbError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const categoryId = Number(id);
    if (isNaN(categoryId)) return errorResponse('Invalid category ID');

    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM categories WHERE category_id = ?`,
      [categoryId]
    );

    if (result.affectedRows === 0) {
      return errorResponse('Category not found', 404);
    }

    return jsonResponse({ message: 'Category deleted successfully', category_id: categoryId });
  } catch (error) {
    return handleDbError(error);
  }
}
