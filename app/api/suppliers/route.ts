import { NextRequest } from 'next/server';
import pool from '@/src/lib/db';
import { handleDbError, jsonResponse, errorResponse } from '@/src/lib/api-handler';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// GET /api/suppliers
export async function GET() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.supplier_id) AS products_count,
        (SELECT COUNT(*) FROM purchases pu WHERE pu.supplier_id = s.supplier_id) AS purchases_count
       FROM suppliers s
       ORDER BY s.supplier_id ASC`
    );
    return jsonResponse(rows);
  } catch (error) {
    return handleDbError(error);
  }
}

// POST /api/suppliers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, address } = body;

    if (!name || !name.trim()) return errorResponse('Supplier name is required.');
    if (!email || !email.trim()) return errorResponse('Email is required.');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return errorResponse('Invalid email format.');
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO suppliers (name, email, phone, address) VALUES (?, ?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), phone?.trim() || null, address?.trim() || null]
    );

    const [newRow] = await pool.execute<RowDataPacket[]>(
      `SELECT *, 0 AS products_count, 0 AS purchases_count FROM suppliers WHERE supplier_id = ?`,
      [result.insertId]
    );

    return jsonResponse(newRow[0], 201);
  } catch (error) {
    return handleDbError(error);
  }
}
