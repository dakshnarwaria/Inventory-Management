import { NextRequest } from 'next/server';
import pool from '@/src/lib/db';
import { handleDbError, jsonResponse, errorResponse } from '@/src/lib/api-handler';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/products/[id]
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = Number(id);
    if (isNaN(productId)) return errorResponse('Invalid product ID');

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, c.category_name, s.name AS supplier_name
       FROM products p
       JOIN categories c ON p.category_id = c.category_id
       JOIN suppliers s ON p.supplier_id = s.supplier_id
       WHERE p.product_id = ?`,
      [productId]
    );

    if (rows.length === 0) return errorResponse('Product not found', 404);
    return jsonResponse(rows[0]);
  } catch (error) {
    return handleDbError(error);
  }
}

// PUT /api/products/[id]
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = Number(id);
    if (isNaN(productId)) return errorResponse('Invalid product ID');

    const body = await request.json();
    const { sku, name, category_id, supplier_id, cost_price, selling_price, reorder_level, stock_qty } = body;

    if (!sku || !sku.trim()) return errorResponse('SKU is required.');
    if (!name || !name.trim()) return errorResponse('Product name is required.');
    if (!category_id) return errorResponse('Category is required.');
    if (!supplier_id) return errorResponse('Supplier is required.');

    const numCost = Number(cost_price);
    const numPrice = Number(selling_price);
    const numReorder = Number(reorder_level);

    if (isNaN(numCost) || numCost < 0) return errorResponse('Cost price must be non-negative.');
    if (isNaN(numPrice) || numPrice < 0) return errorResponse('Selling price must be non-negative.');
    if (isNaN(numReorder) || numReorder < 0) return errorResponse('Reorder level must be non-negative.');

    // If stock_qty was explicitly passed, validate and update it too
    let updateSql = `
      UPDATE products 
      SET sku = ?, name = ?, category_id = ?, supplier_id = ?, cost_price = ?, selling_price = ?, reorder_level = ?
    `;
    const params: any[] = [
      sku.trim().toUpperCase(),
      name.trim(),
      Number(category_id),
      Number(supplier_id),
      numCost,
      numPrice,
      numReorder,
    ];

    if (stock_qty !== undefined && stock_qty !== null) {
      const numStock = Number(stock_qty);
      if (isNaN(numStock) || numStock < 0) return errorResponse('Stock quantity cannot be negative.');
      updateSql += `, stock_qty = ?`;
      params.push(numStock);
    }

    updateSql += ` WHERE product_id = ?`;
    params.push(productId);

    const [result] = await pool.execute<ResultSetHeader>(updateSql, params);

    if (result.affectedRows === 0) {
      return errorResponse('Product not found or no changes made', 404);
    }

    const [updatedRow] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*, c.category_name, s.name AS supplier_name
       FROM products p
       JOIN categories c ON p.category_id = c.category_id
       JOIN suppliers s ON p.supplier_id = s.supplier_id
       WHERE p.product_id = ?`,
      [productId]
    );

    return jsonResponse(updatedRow[0]);
  } catch (error) {
    return handleDbError(error);
  }
}

// DELETE /api/products/[id]
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const productId = Number(id);
    if (isNaN(productId)) return errorResponse('Invalid product ID');

    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM products WHERE product_id = ?`,
      [productId]
    );

    if (result.affectedRows === 0) {
      return errorResponse('Product not found', 404);
    }

    return jsonResponse({ message: 'Product deleted successfully', product_id: productId });
  } catch (error) {
    return handleDbError(error);
  }
}
