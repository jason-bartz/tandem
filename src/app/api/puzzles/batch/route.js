import { NextResponse } from 'next/server';
import { getPuzzleForDate } from '@/lib/db';
import { z } from 'zod';
import logger from '@/lib/logger';

export async function POST(request) {
  try {
    const body = await request.json();
    
    const requestSchema = z.object({
      dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(100)
    });
    
    const { dates } = requestSchema.parse(body);
    
    const puzzlePromises = dates.map(async (date) => {
      try {
        const puzzle = await getPuzzleForDate(date);
        
        if (puzzle && !puzzle.puzzles && puzzle.emojiPairs && puzzle.words) {
          puzzle.puzzles = puzzle.emojiPairs.map((emoji, index) => ({
            emoji: emoji,
            answer: puzzle.words[index] || puzzle.correctAnswers[index]
          }));
        }
        
        return {
          date,
          puzzle: puzzle || null,
          puzzleNumber: puzzle?.puzzleNumber || null
        };
      } catch (error) {
        logger.error(`Error fetching puzzle for ${date}`, error);
        return {
          date,
          puzzle: null,
          puzzleNumber: null,
          error: 'Failed to fetch puzzle'
        };
      }
    });
    
    const puzzles = await Promise.all(puzzlePromises);
    
    return NextResponse.json({
      success: true,
      puzzles: puzzles.reduce((acc, item) => {
        acc[item.date] = item;
        return acc;
      }, {})
    });
  } catch (error) {
    logger.error('POST /api/puzzles/batch error', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request format', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch puzzles' },
      { status: 500 }
    );
  }
}