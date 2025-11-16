# DAILY CRYPTIC PUZZLE GENERATOR PROMPT

## YOUR TASK:

Create ONE cryptic crossword clue using classic cryptic construction techniques.

## CRYPTIC CLUE STRUCTURE

Every cryptic clue has two parts:

1. **Definition** - A straightforward synonym for the answer (usually at the start or end)
2. **Wordplay** - A clever way to construct the answer using cryptic devices

---

## STEP-BY-STEP CONSTRUCTION:

### STEP 1: Build a complete cryptic clue

Create a valid cryptic clue using standard techniques:

- "Scrambled parties for sea raiders (7)" = PIRATES
- "Moods disrupted for gloomy fates (5)" = DOOMS
- "Sting gets Ray wandering (8)" = STRAYING

Verify the cryptic mechanics work perfectly!

### STEP 2: Ensure clarity and fairness

- The definition should be a true synonym of the answer
- The wordplay should lead unambiguously to the answer
- Include the answer length in parentheses at the end

---

## CRYPTIC DEVICES:

### Anagram

Letters rearranged to form a new word

- **Indicators:** mixed, confused, disturbed, scrambled, wild, broken, dancing, crazy, messy, off, drunk, poor, bad, strange, wrong
- **Example:** "Moods disrupted for gloomy fates (5)" = DOOMS (MOODS anagrammed)

### Reversal

Read a word or letters backward

- **Indicators:** back, returned, reversed, around, reflected, retreating, mirror, rolling, twist
- **Example:** "Stop reversed in pans (4)" = POTS (STOP backwards)

### Container

One word placed inside another word

- **Indicators:** in, into, within, holding, containing, around, about, grabs, captures, embracing, wearing, interrupted
- **Example:** "Sting gets Ray wandering (8)" = STRAYING (ST(RAY)ING)

### Deletion

Remove specific letters from a word

- **Indicators:** without, loses, drops, missing, lacking, headless (first), endless (last), heartless (middle), curtailed
- **Example:** "Demons losing direction = monster (5)" = FIEND (FIENDS - S)

### Homophone

A word that sounds like another word

- **Indicators:** sounds like, heard, spoken, said, audibly, aloud, vocal, listening, by ear, reported, mentioned
- **Example:** "Chews sounds like selects (7)" = CHOOSES (sounds like CHEWS)

### Hidden Word

The answer is hiding inside consecutive letters

- **Indicators:** in, within, part of, some of, held by, inside, concealed, buried, partially
- **Example:** "Part of grand river crossing (5)" = RIVER (hidden in "gRAND RIVEr")

### Charade

Two or more parts joined together to make the answer

- **Indicators:** with, and, before, after, following, by, next to, leading
- **Example:** "Sea with shore is beach (8)" = SEASHORE (SEA + SHORE)

### Double Definition

Two different definitions of the same word

- **Indicators:** None - just two definitions
- **Example:** "Bow vessel front (3,4)" = BOW SHIP ("bow" = bend forward, "ship" = vessel, "front" = bow of ship)

### Selection (Initial Letters)

Pick specific letters from words

- **Indicators:** starts, heads, opens, begins, initially, at first, primarily, ends, tails, last, middle, heart
- **Example:** "Solar Eclipse Now Tonight = message (4)" = SENT (first letters)

---

## COMPLETE WORKING EXAMPLES:

### ANAGRAM Example 1:

**Clue:** "Scrambled parties for sea raiders (7)"

- Device: Anagram
- "scrambled" = indicator
- "parties" = fodder
- "sea raiders" = definition
- Mechanics: PARTIES scrambled = PIRATES

### ANAGRAM Example 2:

**Clue:** "Moods disrupted for gloomy fates (5)"

- Device: Anagram
- "moods" = fodder
- "disrupted" = indicator
- "gloomy fates" = definition
- Mechanics: MOODS disrupted = DOOMS

### CONTAINER Example:

**Clue:** "Sting gets Ray wandering (8)"

- Device: Container
- "sting" = outer word
- "gets" = contains indicator
- "Ray" = inner word
- "wandering" = definition
- Mechanics: ST(RAY)ING = STRAYING

### REVERSAL Example:

**Clue:** "Stop reversed in pans (4)"

- Device: Reversal
- "stop" = fodder
- "reversed" = indicator
- "pans" = definition
- Mechanics: STOP reversed = POTS

### CHARADE Example:

**Clue:** "Sea with shore is beach (8)"

- Device: Charade
- "sea" = first part
- "with shore" = second part
- "beach" = definition
- Mechanics: SEA + SHORE = SEASHORE

---

## OUTPUT FORMAT:

```json
{
  "clue": "Moods disrupted for gloomy fates (5)",
  "answer": "DOOMS",
  "length": 5,
  "hints": [
    { "type": "fodder", "text": "The word 'moods' provides the letters we need to work with." },
    {
      "type": "indicator",
      "text": "'Disrupted' signals an anagram - letters need to be rearranged."
    },
    { "type": "mechanics", "text": "The fodder word gets disrupted/scrambled to form the answer." },
    {
      "type": "definition",
      "text": "'Gloomy fates' describes terrible destinies or inevitable ends."
    },
    { "type": "letter", "text": "Starts with D" }
  ],
  "explanation": "MOODS disrupted = DOOMS (gloomy fates)",
  "difficulty_rating": 3,
  "cryptic_device": "anagram"
}
```

---

## FINAL CHECKLIST:

1. [ ] **Definition is accurate:**
   - Must be a true synonym of the answer

2. [ ] **Wordplay is fair:**
   - Indicators are standard and clear
   - Letter counts match
   - Construction follows established rules

3. [ ] **Cryptic mechanics are perfect:**
   - Anagram: same letters rearranged
   - Container: letter counts match
   - Reversal: actually spells backwards
   - Homophone: actually sounds alike

4. [ ] **Clue structure is clear:**
   - Definition + Wordplay (or Wordplay + Definition)
   - Answer length in parentheses
   - No ambiguity in construction

Return ONLY the JSON. No additional explanation.
