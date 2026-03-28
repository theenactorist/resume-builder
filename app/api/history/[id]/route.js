import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET — load a single generation's full result by id
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { rows } = await query(
      'SELECT * FROM generations WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
