import { createPdfExtractionHandler } from '@/lib/pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 20;
export const POST = createPdfExtractionHandler();
