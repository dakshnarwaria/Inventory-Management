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
    const supplierId = Number(id);
    if (isNaN(supplierId)) return errorResponse('Invalid supplier ID');

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.*,
        (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.supplier_id) AS products_count,
        (SELECT COUNT(*) FROM purchases pu WHERE pu.supplier_id = s.supplier_id) AS purchases_count
       FROM suppliers s
       WHERE s.supplier_id = ?`,
      [supplierId]
    );

    if (rows.length === 0) return errorResponse('Supplier not found', 404);
    return jsonResponse(rows[0]);
  } catch (error) {
    return handleDbError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supplierId = Number(id);
    if (isNaN(supplierId)) return errorResponse('Invalid supplier ID');

    const body = await request.json();
    const { name, email, phone, address } = body;

    if (!name || !name.trim()) return errorResponse('Supplier name is required.');
    if (!email || !email.trim()) return errorResponse('Email is required.');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return errorResponse('Invalid email format.');
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE suppliers SET name = ?, email = ?, phone = ?, address = ? WHERE supplier_id = ?`,
      [name.trim(), email.trim().toLowerCase(), phone?.trim() || null, address?.trim() || null, supplierId]
    );

    if (result.affectedRows === 0) {
      return errorResponse('Supplier not found', 404);
    }

    const [updatedRow] = await pool.execute<RowDataPacket[]>(
      `SELECT s.*,
        (SELECT COUNT(*) FROM products p WHERE p.supplier_id = s.supplier_id) AS products_count,
        (SELECT COUNT(*) FROM purchases pu WHERE pu.supplier_id = s.supplier_id) AS purchases_count
       FROM suppliers s
       WHERE s.supplier_id = ?`,
      [supplierId]
    );

    return jsonResponse(updatedRow[0]);
  } catch (error) {
    return handleDbError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supplierId = Number(id);
    if (isNaN(supplierId)) return errorResponse('Invalid supplier ID');

    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM suppliers WHERE supplier_id = ?`,
      [supplierId]
    );

    if (result.affectedRows === 0) {
      return errorResponse('Supplier not found', 404);
    }

    return jsonResponse({ message: 'Supplier deleted successfully', supplier_id: supplierId });
  } catch (error) {
    return handleDbError(error);
  }
}
