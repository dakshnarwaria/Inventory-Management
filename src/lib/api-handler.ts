import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string | number;
}

interface DbErrorLike {
  sqlState?: string;
  errno?: number;
  code?: string | number;
  message?: string;
  sqlMessage?: string;
}

export function handleDbError(error: unknown): NextResponse {
  console.error('Database Error:', error);
  const err = (error || {}) as DbErrorLike;

  // MySQL Trigger Error (SQLSTATE 45000)
  if (err.sqlState === '45000' || err.errno === 1644 || err.code === 'ER_SIGNAL_EXCEPTION') {
    return NextResponse.json(
      {
        success: false,
        error: err.sqlMessage || err.message || 'Trigger constraint failed',
        code: 45000,
      },
      { status: 400 }
    );
  }

  // Duplicate entry error (1062)
  if (err.errno === 1062 || err.code === 'ER_DUP_ENTRY') {
    let field = 'Record';
    if (err.sqlMessage) {
      if (err.sqlMessage.includes('sku')) field = 'A product with this SKU';
      else if (err.sqlMessage.includes('email')) field = 'A record with this email';
      else if (err.sqlMessage.includes('category_name')) field = 'A category with this name';
    }
    return NextResponse.json(
      {
        success: false,
        error: `${field} already exists.`,
        code: 1062,
      },
      { status: 409 }
    );
  }

  // Foreign key constraint block on delete/update (1451)
  if (err.errno === 1451 || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return NextResponse.json(
      {
        success: false,
        error: 'Cannot delete: this record is referenced by other transactions or products.',
        code: 1451,
      },
      { status: 409 }
    );
  }

  // Foreign key not found (1452)
  if (err.errno === 1452 || err.code === 'ER_NO_REFERENCED_ROW_2') {
    return NextResponse.json(
      {
        success: false,
        error: 'Referenced category, supplier, or product does not exist.',
        code: 1452,
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: err.sqlMessage || err.message || 'An internal database error occurred.',
      code: err.code || 500,
    },
    { status: 500 }
  );
}

export function jsonResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}
