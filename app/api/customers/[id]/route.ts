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
    const customerId = Number(id);
    if (isNaN(customerId)) return errorResponse('Invalid customer ID');

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*,
        (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.customer_id) AS sales_count,
        (SELECT COALESCE(SUM(s.total_amount), 0) FROM sales s WHERE s.customer_id = c.customer_id) AS total_spent
       FROM customers c
       WHERE c.customer_id = ?`,
      [customerId]
    );

    if (rows.length === 0) return errorResponse('Customer not found', 404);
    return jsonResponse(rows[0]);
  } catch (error) {
    return handleDbError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const customerId = Number(id);
    if (isNaN(customerId)) return errorResponse('Invalid customer ID');

    const body = await request.json();
    const { name, email, phone, address } = body;

    if (!name || !name.trim()) return errorResponse('Customer name is required.');
    if (!email || !email.trim()) return errorResponse('Email is required.');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return errorResponse('Invalid email format.');
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE customer_id = ?`,
      [name.trim(), email.trim().toLowerCase(), phone?.trim() || null, address?.trim() || null, customerId]
    );

    if (result.affectedRows === 0) {
      return errorResponse('Customer not found', 404);
    }

    const [updatedRow] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*,
        (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.customer_id) AS sales_count,
        (SELECT COALESCE(SUM(s.total_amount), 0) FROM sales s WHERE s.customer_id = c.customer_id) AS total_spent
       FROM customers c
       WHERE c.customer_id = ?`,
      [customerId]
    );

    return jsonResponse(updatedRow[0]);
  } catch (error) {
    return handleDbError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const customerId = Number(id);
    if (isNaN(customerId)) return errorResponse('Invalid customer ID');

    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM customers WHERE customer_id = ?`,
      [customerId]
    );

    if (result.affectedRows === 0) {
      return errorResponse('Customer not found', 404);
    }

    return jsonResponse({ message: 'Customer deleted successfully', customer_id: customerId });
  } catch (error) {
    return handleDbError(error);
  }
}
