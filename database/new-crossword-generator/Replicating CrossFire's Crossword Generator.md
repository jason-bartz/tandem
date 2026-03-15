# Replicating CrossFire's Crossword Generator for Your Mini Crossword

## How CrossFire Actually Works

CrossFire by Beekeeper Labs is a Java-based crossword construction tool that combines a **scored dictionary system** with an **interactive constraint-satisfaction fill engine** [^1][^2]. Understanding its internals reveals why it works so well — and why naive AI generation or basic word lists alone fail.

### The Scored Dictionary System

CrossFire's foundation is one or more dictionary files where every word has a score from 1–100 [^3]. The scoring reflects how "desirable" a word is for crossword use:

- Words scoring below a configurable threshold (default: 5) are excluded from fills entirely [^2]
- Multiple dictionaries can be layered — higher-priority files override lower ones [^3]
- Constructors curate their dictionaries over time, downscoring junk words and adding lively entries [^2]

This is the **single biggest reason CrossFire produces real words and your generator doesn't**. Without a scored, curated word list, any algorithm will either produce gibberish or fail to find solutions.

### The Autofill / Interactive Fill Algorithm

CrossFire's fill engine operates in several phases when you select a grid slot [^2][^3]:

1. **Candidate Generation**: It finds all dictionary words that physically fit the slot (correct length, matching any already-placed letters). Status: "_Generating candidates_"
2. **Candidate Evaluation / Viability Testing**: For each candidate word, it performs a **lookahead search** — essentially asking "if I place this word here, can the rest of the grid still be filled with valid words?" Non-viable candidates are removed; viable ones are bolded. Status: "_Evaluating candidates_"
3. **Scoring**: Each viable candidate gets three scores [^3]:
   - **Word Score**: The raw dictionary score (word quality)
   - **Grid Score**: Quality of the neighborhood around the word (>0.9 is good)
   - **Final Score**: Quality of a complete sample fill using this word, relative to the first fill found
4. **Best Location**: CrossFire can identify the most constrained slot in the grid — the "hardest" area — and suggest you start there, giving the most "bang for the buck" [^2]

The **Quick Fill** button attempts a complete automatic fill with randomness, so hitting it multiple times yields different results [^3]. If it fails, it highlights the failure region in red.

### Why This Works

CrossFire's reliability comes from:

- **Constraint propagation**: When a word is placed, it immediately constrains all crossing words
- **Lookahead / viability testing**: It doesn't just check "does this word fit now?" — it checks "can the grid still be completed?"
- **Backtracking**: Full undo support means it can explore and retreat from dead ends
- **Quality word list**: The dictionary ensures only real, scored words are considered

---

## Why Your Current Approach Fails

Based on your description, you've tried two approaches that both have fundamental problems:

### Pure AI Generation

LLMs are terrible at crossword filling because they don't understand the **combinatorial constraint structure** of a grid [^16]. An LLM generating words one at a time can't reliably ensure that the 3rd letter of an across word is also the 2nd letter of a down word — across the entire grid simultaneously. LLMs hallucinate non-words and can't systematically backtrack.

### Basic Word Lists Without Constraint Satisfaction

A word list alone isn't enough. If you're just randomly picking words that fit letter patterns, you'll hit dead ends where no word exists for a remaining slot. Without **backtracking** (the ability to undo a previous choice and try a different word), one bad placement early on poisons the entire grid.

---

## How to Replicate CrossFire's Approach

Here's the architecture you should build, specifically tailored for a 5×5 mini crossword:

### Step 1: Get a Quality Scored Word List

This is non-negotiable. You need a curated list of 3-, 4-, and 5-letter words with quality scores.

**Free options:**

- **Chris Jones' scored wordlist** (~170k entries, scored, designed for CrossFire/Crossword Compiler) [^27]
- **Peter Broda's wordlist** (574k entries, partially scored) [^28]
- **Crossword Nexus** list (unscored but comprehensive) [^28]

For a 5×5 mini, you mainly need words of lengths 3–5. Filter your word list to just those lengths and index them.

### Step 2: Build a Pre-Computed Letter-Position Index

This is the key data structure that makes constraint checking fast [^11]. For every word in your list, pre-compute a mapping of `(position, letter) → set of words`:

```python
from collections import defaultdict

position_letter_index = defaultdict(set)
words_by_length = defaultdict(list)

for word in word_list:
    words_by_length[len(word)].append(word)
    for pos, letter in enumerate(word.upper()):
        position_letter_index[(len(word), pos, letter)].add(word)
```

When you need to find all 5-letter words where position 2 is 'A' and position 4 is 'T', you just intersect two sets — this is nearly instant compared to scanning the entire list [^11].

### Step 3: Implement Constraint Propagation

For a 5×5 grid, define your slots (typically 5 across + 5 down = 10 words for a standard mini). Each slot has a **domain** — the set of words that could still go there.

When you place a word in a slot, propagate constraints to all crossing slots:

```python
def propagate(grid, slots):
    changed = True
    while changed:
        changed = False
        for slot in slots:
            if slot.is_filled:
                continue
            # For each crossing slot, the intersection letter is fixed
            new_domain = get_compatible_words(slot, grid)
            if len(new_domain) < len(slot.domain):
                slot.domain = new_domain
                changed = True
            if len(new_domain) == 0:
                return False  # Dead end — no valid words for this slot
    return True
```

This is an AC-3 style approach [^7][^25]. After each word placement, you filter every crossing slot's domain to only words compatible with the newly fixed letters. If any domain becomes empty, you know this path is a dead end.

### Step 4: Implement Backtracking Search

This is what CrossFire does under the hood during its viability testing [^2]. The algorithm:

1. **Pick the most constrained slot** (fewest remaining words in its domain — this is the "Minimum Remaining Values" heuristic) [^7][^11]
2. **Try each word** in that slot's domain (ordered by score, highest first)
3. **Propagate constraints** after placement
4. **Recurse** to the next most constrained slot
5. **If stuck**, undo the last placement and try the next word (backtrack)

```python
def solve(grid, slots):
    # Find the unfilled slot with the smallest domain
    unfilled = [s for s in slots if not s.is_filled]
    if not unfilled:
        return True  # All slots filled — success!

    slot = min(unfilled, key=lambda s: len(s.domain))

    # Try words in score order (best words first)
    for word in sorted(slot.domain, key=lambda w: word_scores[w], reverse=True):
        # Save state for backtracking
        saved_state = save_grid_state(grid, slots)

        place_word(grid, slot, word)

        if propagate(grid, slots):
            if solve(grid, slots):
                return True

        # Backtrack
        restore_grid_state(grid, slots, saved_state)

    return False  # No word works here — backtrack further
```

For a 5×5 mini with a good word list, this typically solves in **milliseconds** [^11][^25].

### Step 5: Layer AI on Top (Not Underneath)

Here's where AI becomes powerful — **not as the grid filler**, but as a creative supplement:

- **Theme word generation**: Ask the LLM to generate themed 3–5 letter words for a given topic. Validate them against your word list or a dictionary API. Place these as "seed" words before running the solver [^16].
- **Clue generation**: After the grid is filled with valid words, use the LLM to generate clues. This is where AI shines — it's great at creative language tasks [^16][^25].
- **Word list expansion**: Use AI to suggest common words/phrases that might be missing from your word list, then manually verify and add them with scores.
- **Difficulty tuning**: Use AI to rate clue difficulty or suggest alternative clues at different difficulty levels.

---

## Recommended Architecture for Your Mini Crossword Generator

| Component         | CrossFire's Approach                           | Your Replication                                          |
| ----------------- | ---------------------------------------------- | --------------------------------------------------------- |
| Word source       | Scored dictionary files (`;score` format)      | Scored word list (JSON/CSV), filtered to 3–5 letter words |
| Word quality      | 1–100 scores, min threshold                    | Score each word; reject below threshold                   |
| Candidate finding | Dictionary lookup + length/letter match        | Pre-computed `(length, position, letter)` index           |
| Viability testing | Lookahead: "can this lead to a complete fill?" | Constraint propagation + backtracking                     |
| Fill strategy     | Start at most constrained location             | Minimum Remaining Values heuristic                        |
| Backtracking      | Full undo/redo stack                           | Recursive backtracking with state save/restore            |
| AI role           | Not used (pure algorithmic)                    | Theme words, clue generation, word list curation          |

## Quick-Start Implementation Path

1. **Download** Chris Jones' scored wordlist from GitHub [^27] and filter it to 3–5 letter words
2. **Build the index**: Create `position_letter_index` and `words_by_length` dictionaries
3. **Define the grid**: For a standard 5×5 mini, define 10 slots (5 across, 5 down) with their intersection points
4. **Implement backtracking + constraint propagation** as described above
5. **Test**: Run it on an empty 5×5 grid — it should fill in under a second
6. **Add AI layer**: Use an LLM to generate seed/theme words, validate them, place them, then run the solver around them
7. **Add clue generation**: After a valid grid is produced, send the words to an LLM for clue writing

## Handling the "CrossFire Feel" — Autofill and Interactive Features

To replicate CrossFire's interactive experience [^2][^3]:

- **Autofill button**: Run the backtracking solver on the current grid state. Add randomness by shuffling word order within score tiers so each click produces a different valid fill.
- **Candidate list**: When a user clicks a slot, show all viable words (words where `propagate()` doesn't return False). Bold the ones that are confirmed viable via deeper lookahead.
- **"Best Location"**: Find the unfilled slot with the smallest domain — that's where the user should focus next.
- **Undo/Redo**: Maintain a stack of grid states so users can backtrack their own choices.
- **Word scoring display**: Show word scores from your dictionary alongside candidates so users can pick higher-quality fills.

## Key Takeaways

- **The word list is everything**. CrossFire's power comes from curated, scored dictionaries — not a clever algorithm alone [^2][^27].
- **AI should not fill the grid**. Use constraint satisfaction with backtracking for grid filling; use AI for creative tasks (themes, clues) [^16][^25].
- **Pre-computed indexes** make constraint checking nearly instant instead of scanning thousands of words [^11].
- **Backtracking is essential**. Without the ability to undo bad choices and try alternatives, the solver will fail on most grids [^7][^15].
- **For a 5×5 mini, this is very tractable**. The solution space is small enough that a well-implemented solver with a good word list will find valid fills in milliseconds [^11][^17].

---

## References

1. [CrossFire crossword creator](https://beekeeperlabs.com/crossfire/) - CrossFire is an innovative tool for creating professional quality crossword puzzles. It has been des...

2. [Making a Puzzle with CrossFire](https://beekeeperlabs.com/crossfire/walkthrough.html) - Tutorial: CrossFire is a professional tool for creating crossword puzzles. From theme to clues, Cros...

3. [An Introduction to CrossFire](https://beekeeperlabs.com/crossfire/docs/index.html) - CrossFire provides a simple but powerful single-window application for creating crossword puzzles.

4. [AI that generates crosswords puzzles using Backtracking ... - GitHub](https://github.com/arielfayol37/Crossword) - This project generates crossword puzzles automatically using constraint satisfaction problem (CSP) a...

5. [Building a Crossword Generator with Constraint Satisfaction ...](https://neilagrawal.com/post/implementing-csp-crossword-generation/) - In this post, I'll walk you through how I implemented a crossword generator using Constraint Satisfa...

6. [Algorithm to generate a crossword [closed] - Stack Overflow](https://stackoverflow.com/questions/943113/algorithm-to-generate-a-crossword) - The idea is to formulate the crossword generation problem as a constraint satisfaction problem and s...

7. [A dynamic Mini Crossword Generator powered by LLM ... - GitHub](https://github.com/RivanJarjes/miniCrosswordGenerator) - A dynamic Mini Crossword Generator powered by LLM, inspired by the NYT Mini Crossword. Creates theme...

8. [bakitybacon/minicrossword: Mini Crossword Generator ... - GitHub](https://github.com/bakitybacon/minicrossword) - This project attempts to generate a 5 by 5 miniature crossword (like you can find in the New York Ti...

9. [Algorithmically Generated Crosswords: Building something 'good ...](https://blog.eyas.sh/2025/12/algorithmic-crosswords/) - Instead, we simply decide to restrict that row to words from A-M, then propagate the consequences th...

10. [christophsjones/crossword-wordlist - GitHub](https://github.com/christophsjones/crossword-wordlist) - Scored wordlist for use with construction software such as Crossword Compiler or Crossfire. About 17...

11. [All the downloadable word lists I've been able to find : r/crossword](https://www.reddit.com/r/crossword/comments/nqsuku/all_the_downloadable_word_lists_ive_been_able_to/) - I've collected as many publicly available word lists as I could find. Here's everything I have. If a...
