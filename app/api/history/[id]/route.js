export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { error: 'Server history is private. Visitor generations are kept only in the current page session.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } }
  );
}
