import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import logger from '@/lib/logger';

/**
 * GET /api/admin/avatars
 * Fetch all avatars (including inactive ones for admin)
 */
export async function GET(request) {
  try {
    // Verify admin authentication (GET requests skip CSRF validation)
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('avatars')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      logger.error('[GET /api/admin/avatars] Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch avatars' }, { status: 500 });
    }

    return NextResponse.json({ success: true, avatars: data || [] });
  } catch (error) {
    logger.error('[GET /api/admin/avatars] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/avatars
 * Create a new avatar with image upload to Supabase Storage
 *
 * Expects multipart form data:
 * - image: File (image file)
 * - id: string (unique identifier, e.g., "berry")
 * - display_name: string (e.g., "Berry")
 * - bio: string (character description)
 * - alchemy_bio: string (optional, alchemy-themed character description for dailyalchemy.fun)
 * - is_active: boolean (optional, defaults to false)
 */
export async function POST(request) {
  try {
    // Verify admin authentication with CSRF validation
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const formData = await request.formData();
    const image = formData.get('image');
    const id = formData.get('id');
    const displayName = formData.get('display_name');
    const bio = formData.get('bio');
    const alchemyBio = formData.get('alchemy_bio') || null;
    const isActive = formData.get('is_active') === 'true';

    // Validate required fields
    if (!image || !id || !displayName || !bio) {
      return NextResponse.json(
        { error: 'Missing required fields: image, id, display_name, bio' },
        { status: 400 }
      );
    }

    // Validate image is a file
    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'Image must be a file' }, { status: 400 });
    }

    // Validate image type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json({ error: 'Image must be PNG, JPEG, or WebP' }, { status: 400 });
    }

    // Validate ID format (lowercase, alphanumeric, hyphens)
    const idRegex = /^[a-z0-9-]+$/;
    if (!idRegex.test(id)) {
      return NextResponse.json(
        { error: 'ID must be lowercase alphanumeric with hyphens only' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if avatar with this ID already exists
    const { data: existing } = await supabase.from('avatars').select('id').eq('id', id).single();

    if (existing) {
      return NextResponse.json({ error: `Avatar with ID "${id}" already exists` }, { status: 409 });
    }

    // Get file extension from original filename or MIME type
    const ext = image.name.split('.').pop() || (image.type === 'image/png' ? 'png' : 'jpg');
    const filename = `${id}.${ext}`;

    // Upload image to Supabase Storage
    const imageBuffer = await image.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, imageBuffer, {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error('[POST /api/admin/avatars] Storage upload error:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload image: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get the public URL for the uploaded image
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename);

    const imagePath = urlData.publicUrl;

    // Get the highest sort_order and add 1
    const { data: maxSortData } = await supabase
      .from('avatars')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (maxSortData?.sort_order || 0) + 1;

    // Insert avatar record into database
    const { data: avatar, error: insertError } = await supabase
      .from('avatars')
      .insert({
        id,
        display_name: displayName,
        bio,
        alchemy_bio: alchemyBio,
        image_path: imagePath,
        is_active: isActive,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (insertError) {
      // Clean up uploaded image if database insert fails
      await supabase.storage.from('avatars').remove([filename]);
      logger.error('[POST /api/admin/avatars] Database insert error:', insertError);
      return NextResponse.json(
        { error: `Failed to create avatar: ${insertError.message}` },
        { status: 500 }
      );
    }

    logger.info('[POST /api/admin/avatars] Avatar created:', { id, displayName });
    return NextResponse.json({ success: true, avatar }, { status: 201 });
  } catch (error) {
    logger.error('[POST /api/admin/avatars] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/avatars
 * Update an existing avatar
 *
 * Body (JSON):
 * - id: string (required - identifies which avatar to update)
 * - display_name?: string
 * - bio?: string
 * - is_active?: boolean
 * - sort_order?: number
 */
export async function PUT(request) {
  try {
    // Verify admin authentication with CSRF validation
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Avatar ID is required' }, { status: 400 });
    }

    // Only allow specific fields to be updated
    const allowedFields = ['display_name', 'bio', 'alchemy_bio', 'is_active', 'sort_order'];
    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Add updated_at timestamp
    filteredUpdates.updated_at = new Date().toISOString();

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('avatars')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('[PUT /api/admin/avatars] Database error:', error);
      return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    logger.info('[PUT /api/admin/avatars] Avatar updated:', { id });
    return NextResponse.json({ success: true, avatar: data });
  } catch (error) {
    logger.error('[PUT /api/admin/avatars] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/avatars
 * Delete an avatar (removes from database and storage)
 *
 * Query params:
 * - id: string (avatar ID to delete)
 */
export async function DELETE(request) {
  try {
    // Verify admin authentication with CSRF validation
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Avatar ID is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get the avatar to find its image path
    const { data: avatar, error: fetchError } = await supabase
      .from('avatars')
      .select('id, image_path')
      .eq('id', id)
      .single();

    if (fetchError || !avatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    // Check if any users are using this avatar
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('selected_avatar_id', id);

    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete avatar: ${count} user(s) are using it. Deactivate instead.` },
        { status: 409 }
      );
    }

    // Delete from database first
    const { error: deleteError } = await supabase.from('avatars').delete().eq('id', id);

    if (deleteError) {
      logger.error('[DELETE /api/admin/avatars] Database error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete avatar' }, { status: 500 });
    }

    // Try to delete from storage (only if it's a Supabase Storage URL)
    if (avatar.image_path && avatar.image_path.includes('/storage/')) {
      // Extract filename from URL
      const filename = avatar.image_path.split('/').pop();
      if (filename) {
        const { error: storageError } = await supabase.storage.from('avatars').remove([filename]);

        if (storageError) {
          logger.warn('[DELETE /api/admin/avatars] Storage delete warning:', storageError);
          // Don't fail the request if storage delete fails
        }
      }
    }

    logger.info('[DELETE /api/admin/avatars] Avatar deleted:', { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[DELETE /api/admin/avatars] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
