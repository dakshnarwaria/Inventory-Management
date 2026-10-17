import { NextRequest } from 'next/server';
import pool from '@/src/lib/db';
import { handleDbError, jsonResponse, errorResponse } from '@/src/lib/api-handler';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// GET /api/customers
export async function GET() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.customer_id) AS sales_count,
        (SELECT COALESCE(SUM(s.total_amount), 0) FROM sales s WHERE s.customer_id = c.customer_id) AS total_spent
       FROM customers c
       ORDER BY c.customer_id ASC`
    );
    return jsonResponse(rows);
  } catch (error) {
    return handleDbError(error);
  }
}

// POST /api/customers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, address } = body;

    if (!name || !name.trim()) return errorResponse('Customer name is required.');
    if (!email || !email.trim()) return errorResponse('Email is required.');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return errorResponse('Invalid email format.');
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), phone?.trim() || null, address?.trim() || null]
    );

    const [newRow] = await pool.execute<RowDataPacket[]>(
      `SELECT *, 0 AS sales_count, 0 AS total_spent FROM customers WHERE customer_id = ?`,
      [result.insertId]
    );

    return jsonResponse(newRow[0], 201);
  } catch (error) {
    return handleDbError(error);
  }
}
