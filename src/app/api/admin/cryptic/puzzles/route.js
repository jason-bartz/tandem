import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/cryptic/puzzles
 * Fetch all cryptic puzzles (admin only)
 * Optional query params:
 * - startDate: filter puzzles from this date onwards
 * - endDate: filter puzzles up to this date
 * - limit: number of puzzles to return
 */
export async function GET(request) {
  try {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const supabase = createServerClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Build query
    let query = supabase
      .from('cryptic_puzzles')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: puzzles, error } = await query;

    if (error) {
      console.error('Error fetching puzzles:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ puzzles }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/admin/cryptic/puzzles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/cryptic/puzzles
 * Create a new cryptic puzzle (admin only)
 * Body: { date, clue, answer, length, hints, explanation, difficulty_rating, cryptic_device }
 */
export async function POST(request) {
  try {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const supabase = createServerClient();

    const body = await request.json();
    const { date, clue, answer, length, word_pattern, hints, explanation, difficulty_rating, cryptic_device } = body;

    // Validate required fields
    if (!date || !clue || !answer || !length || !hints || !explanation) {
      return NextResponse.json(
        { error: 'Missing required fields: date, clue, answer, length, hints, explanation' },
        { status: 400 }
      );
    }

    // Validate hints array
    if (!Array.isArray(hints) || hints.length !== 4) {
      return NextResponse.json({ error: 'Hints must be an array of 4 items' }, { status: 400 });
    }

    // Validate answer length matches (total letters excluding spaces)
    const totalLetters = answer.replace(/\s/g, '').length;
    if (totalLetters !== length) {
      return NextResponse.json(
        { error: `Answer length (${totalLetters} letters) does not match specified length (${length})` },
        { status: 400 }
      );
    }

    // Validate word_pattern if provided
    if (word_pattern) {
      const words = answer.trim().split(/\s+/);
      if (words.length !== word_pattern.length) {
        return NextResponse.json(
          { error: `Word pattern length (${word_pattern.length}) does not match actual word count (${words.length})` },
          { status: 400 }
        );
      }
      for (let i = 0; i < words.length; i++) {
        if (words[i].length !== word_pattern[i]) {
          return NextResponse.json(
            { error: `Word ${i + 1} has ${words[i].length} letters but pattern specifies ${word_pattern[i]}` },
            { status: 400 }
          );
        }
      }
    }

    // Insert puzzle (created_by is optional and requires a UUID from users table)
    const insertData = {
      date,
      clue,
      answer: answer.toUpperCase(),
      length,
      hints,
      explanation,
      difficulty_rating,
      cryptic_device,
    };

    // Only include word_pattern if provided (database will auto-calculate if not)
    if (word_pattern) {
      insertData.word_pattern = word_pattern;
    }

    const { data: puzzle, error } = await supabase
      .from('cryptic_puzzles')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating puzzle:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ puzzle }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/cryptic/puzzles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/cryptic/puzzles
 * Update an existing cryptic puzzle (admin only)
 * Body: { id, ...fields to update }
 */
export async function PUT(request) {
  try {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const supabase = createServerClient();

    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing puzzle id' }, { status: 400 });
    }

    // If answer is being updated, ensure it's uppercase
    if (updateFields.answer) {
      updateFields.answer = updateFields.answer.toUpperCase();
    }

    // Validate answer length if both are provided (total letters excluding spaces)
    if (updateFields.answer && updateFields.length) {
      const totalLetters = updateFields.answer.replace(/\s/g, '').length;
      if (totalLetters !== updateFields.length) {
        return NextResponse.json(
          {
            error: `Answer length (${totalLetters} letters) does not match specified length (${updateFields.length})`,
          },
          { status: 400 }
        );
      }
    }

    // Validate word_pattern if provided with answer
    if (updateFields.word_pattern && updateFields.answer) {
      const words = updateFields.answer.trim().split(/\s+/);
      if (words.length !== updateFields.word_pattern.length) {
        return NextResponse.json(
          { error: `Word pattern length (${updateFields.word_pattern.length}) does not match actual word count (${words.length})` },
          { status: 400 }
        );
      }
      for (let i = 0; i < words.length; i++) {
        if (words[i].length !== updateFields.word_pattern[i]) {
          return NextResponse.json(
            { error: `Word ${i + 1} has ${words[i].length} letters but pattern specifies ${updateFields.word_pattern[i]}` },
            { status: 400 }
          );
        }
      }
    }

    // Update puzzle
    const { data: puzzle, error } = await supabase
      .from('cryptic_puzzles')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating puzzle:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ puzzle }, { status: 200 });
  } catch (error) {
    console.error('Error in PUT /api/admin/cryptic/puzzles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/cryptic/puzzles
 * Delete a cryptic puzzle (admin only)
 * Query param: id
 */
export async function DELETE(request) {
  try {
    // Require admin authentication
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return authResult.error;
    }

    const supabase = createServerClient();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing puzzle id' }, { status: 400 });
    }

    // Delete puzzle
    const { error } = await supabase.from('cryptic_puzzles').delete().eq('id', id);

    if (error) {
      console.error('Error deleting puzzle:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/admin/cryptic/puzzles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
