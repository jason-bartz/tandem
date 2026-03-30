import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/security/rateLimiter';
import logger from '@/lib/logger';

// GET - list all announcements (admin sees all, not just active)
export async function GET(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, announcements: data });
  } catch (error) {
    logger.error('Error fetching announcements', error);
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

// POST - create a new announcement
export async function POST(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const { text, active = true } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Announcement text is required' }, { status: 400 });
    }

    if (text.trim().length > 500) {
      return NextResponse.json(
        { error: 'Announcement text must be 500 characters or less' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('announcements')
      .insert({ text: text.trim(), active })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, announcement: data });
  } catch (error) {
    logger.error('Error creating announcement', error);
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
}

// PUT - update an announcement
export async function PUT(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const { id, text, active } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const updates = {};
    if (text !== undefined) {
      if (typeof text !== 'string' || text.trim().length === 0) {
        return NextResponse.json({ error: 'Announcement text cannot be empty' }, { status: 400 });
      }
      if (text.trim().length > 500) {
        return NextResponse.json(
          { error: 'Announcement text must be 500 characters or less' },
          { status: 400 }
        );
      }
      updates.text = text.trim();
    }
    if (active !== undefined) {
      updates.active = active;
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, announcement: data });
  } catch (error) {
    logger.error('Error updating announcement', error);
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}

// DELETE - remove an announcement
export async function DELETE(request) {
  try {
    const rateLimitResponse = await withRateLimit(request, 'general');
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAdmin(request);
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('announcements').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting announcement', error);
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
  }
}
