import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET — list all saved generations (metadata only, not full result)
export async function GET() {
  try {
    const { rows } = await query(
      `SELECT id, company_name, job_title, created_at
       FROM generations
       ORDER BY created_at DESC`
    );
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — save a new generation
export async function POST(request) {
  try {
    const { company_name, job_title, job_description, result } = await request.json();

    if (!company_name || !result) {
      return NextResponse.json({ error: 'company_name and result are required' }, { status: 400 });
    }

    const { rows } = await query(
      `INSERT INTO generations (company_name, job_title, job_description, result)
       VALUES ($1, $2, $3, $4)
       RETURNING id, company_name, job_title, created_at`,
      [company_name, job_title || null, job_description || null, JSON.stringify(result)]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove a generation by id
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await query('DELETE FROM generations WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
