import { createGenerateHandler } from '@/lib/generation';
import { acquireGeneration } from '@/lib/generation-limits';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';
export const POST = createGenerateHandler({ acquire: acquireGeneration });
