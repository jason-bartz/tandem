import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    keyLength: process.env.ANTHROPIC_API_KEY?.length,
    keyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 15),
    aiEnabled: process.env.AI_GENERATION_ENABLED,
    aiModel: process.env.AI_MODEL,
    nodeEnv: process.env.NODE_ENV,
    allAIKeys: Object.keys(process.env).filter((k) => k.includes('AI') || k.includes('ANTHROPIC')),
  });
}
