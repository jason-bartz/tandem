import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import aiService from '@/services/ai.service';

/**
 * Diagnostic endpoint to check AI service configuration
 * GET /api/admin/ai-diagnostics
 */
export async function GET(request) {
  try {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    // Collect comprehensive diagnostics
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        keyLength: process.env.ANTHROPIC_API_KEY?.length,
        keyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 15),
        aiGenerationEnabled: process.env.AI_GENERATION_ENABLED,
        aiModel: process.env.AI_MODEL,
        allAIEnvKeys: Object.keys(process.env).filter(
          (k) => k.includes('AI') || k.includes('ANTHROPIC')
        ),
      },
      aiService: {
        isEnabled: aiService.isEnabled(),
        model: aiService.model,
        maxRetries: aiService.maxRetries,
        timeout: aiService.timeout,
        generationCount: aiService.generationCount,
      },
      clientInfo: {
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      },
    };

    // Try to create a client to verify credentials
    let clientStatus = 'not_attempted';
    try {
      const client = aiService.getClient();
      clientStatus = client ? 'created_successfully' : 'failed_to_create';
    } catch (error) {
      clientStatus = `error: ${error.message}`;
    }
    diagnostics.aiService.clientStatus = clientStatus;

    // Determine overall status
    const isHealthy =
      diagnostics.environment.hasAnthropicKey &&
      diagnostics.aiService.isEnabled &&
      clientStatus === 'created_successfully';

    return NextResponse.json({
      success: true,
      healthy: isHealthy,
      diagnostics,
      recommendations: isHealthy
        ? ['✅ AI generation should be working']
        : [
            !diagnostics.environment.hasAnthropicKey &&
              '❌ ANTHROPIC_API_KEY not found in environment',
            !diagnostics.aiService.isEnabled && '❌ AI service is disabled',
            clientStatus !== 'created_successfully' && `❌ Client creation failed: ${clientStatus}`,
          ].filter(Boolean),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
