// Legacy records have no owner identity. Keep them private and untouched.
export const dynamic = 'force-dynamic';

function unavailable() {
  return Response.json(
    { error: 'Server history is private. Visitor generations are kept only in the current page session.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}

export const GET = unavailable;
export const POST = unavailable;
export const DELETE = unavailable;
