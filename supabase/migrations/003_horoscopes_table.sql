-- =====================================================
-- Horoscopes Table Migration
-- =====================================================
-- Creates table for storing zodiac sign horoscopes
-- Used for displaying daily rotating horoscopes on account page
--
-- Created: 2025-10-30
-- =====================================================

-- =====================================================
-- 1. HOROSCOPES TABLE
-- =====================================================
-- Stores 30 horoscopes for each of the 12 zodiac signs
-- Total: 360 horoscopes
-- Public read access, no user modifications needed

CREATE TABLE IF NOT EXISTS horoscopes (
  id SERIAL PRIMARY KEY,
  sign TEXT NOT NULL CHECK (sign IN (
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces'
  )),
  horoscope_number SMALLINT NOT NULL CHECK (horoscope_number BETWEEN 1 AND 30),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE horoscopes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can read horoscopes (public data)
CREATE POLICY "Horoscopes are publicly readable"
  ON horoscopes
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_horoscopes_sign ON horoscopes(sign);
CREATE UNIQUE INDEX IF NOT EXISTS idx_horoscopes_sign_number ON horoscopes(sign, horoscope_number);

-- Grant SELECT to authenticated and anon users
GRANT SELECT ON horoscopes TO authenticated, anon;

-- =====================================================
-- 2. SEED DATA - All 360 Horoscopes
-- =====================================================

-- Aries (30 horoscopes)
INSERT INTO horoscopes (sign, horoscope_number, text) VALUES
('Aries', 1, 'Your tendency to start sentences with "Actually" will serve you well today. Sprint through that paragraph like you sprint through life—recklessly and without looking back.'),
('Aries', 2, 'The Oxford comma fears you, and for good reason. You don''t have time for unnecessary punctuation.'),
('Aries', 3, 'Mercury may be in retrograde, but your forward momentum knows no planetary boundaries. Delete your drafts and hit send.'),
('Aries', 4, 'Today''s fortune favors the bold—literally. Use that bold button with wild abandon.'),
('Aries', 5, 'Your horoscope is short today because you''ve already stopped reading and moved on to the next thing.'),
('Aries', 6, 'The passive voice was avoided by you today. Good. Stay active, stay aggressive.'),
('Aries', 7, 'That email doesn''t need another revision. Your first instinct was correct. It''s always correct.'),
('Aries', 8, 'You''ll encounter a subordinate clause today. Don''t let it subordinate you.'),
('Aries', 9, 'The universe suggests you start three new writing projects today and finish none of them. This is on-brand.'),
('Aries', 10, 'Your autocorrect has given up trying to tame you. Respect.'),
('Aries', 11, 'Today you''ll win an argument about grammar that nobody else knew was happening.'),
('Aries', 12, 'The em dash is your spirit punctuation—fierce, decisive, and always interrupting.'),
('Aries', 13, 'You''re about to use "irregardless" just to watch the world burn. The stars support this chaos.'),
('Aries', 14, 'Your reading speed will increase by 40% today because you''re skipping all the boring parts. As you should.'),
('Aries', 15, 'That semicolon doesn''t know what hit it; you barely know how to use it, but you used it anyway.'),
('Aries', 16, 'The thesaurus trembles at your approach. Why use a synonym when the first word was perfect?'),
('Aries', 17, 'You''ll start a sentence today that you won''t finish because—look, something shiny!'),
('Aries', 18, 'Your subject and verb will agree today, mostly because they''re too intimidated to disagree with you.'),
('Aries', 19, 'Today''s password should be "CAPS LOCK FOREVER" because subtlety is for other signs.'),
('Aries', 20, 'You''ve already skipped to horoscope #20 because sequential reading is for the weak.'),
('Aries', 21, 'The exclamation point was invented for Aries! Use at least seventeen today!'),
('Aries', 22, 'Your writing voice is so strong today it''s basically shouting. Don''t tone it down.'),
('Aries', 23, 'Alliteration attacks aggressively as Aries acts audaciously. Sorry, couldn''t help it.'),
('Aries', 24, 'You''ll abbreviate everything today bc y not? Time is money and sentences r slow.'),
('Aries', 25, 'The introduction and conclusion of your essay will be identical because you forgot what you wrote at the beginning.'),
('Aries', 26, 'Your text messages will contain zero punctuation today and everyone will still understand your urgency.'),
('Aries', 27, 'You''re about to correct someone''s grammar mid-argument and WIN both battles.'),
('Aries', 28, 'The word "patience" is not in your vocabulary today. Actually, it''s never been there.'),
('Aries', 29, 'You''ll discover a new favorite word today and overuse it immediately. This is your way.'),
('Aries', 30, 'Today''s mantra: "I came, I saw, I didn''t proofread." And it''s still better than everyone else''s work.');

-- Taurus (30 horoscopes)
INSERT INTO horoscopes (sign, horoscope_number, text) VALUES
('Taurus', 1, 'Your love of the serial comma is as steadfast as your love of luxury. Never compromise on either.'),
('Taurus', 2, 'Today you''ll reread the same paragraph five times because it''s cozy there and you''re not ready to move on.'),
('Taurus', 3, 'The em dash and en dash are different, you know this, you''ve always known this, and you''ll die on this hill.'),
('Taurus', 4, 'Your favorite genre is comfort-reading, which is just rereading the same book for the 47th time.'),
('Taurus', 5, 'You''ve been using the same password since 2009 and you see no reason to change it now.'),
('Taurus', 6, 'The stars indicate you should buy another book today, even though you have 47 unread books at home. They''re an investment.'),
('Taurus', 7, 'Your vocabulary is rich like velvet, smooth like butter, and expensive like truffle oil.'),
('Taurus', 8, 'You''ll spend 20 minutes choosing the perfect word today. This is not procrastination; it''s craftsmanship.'),
('Taurus', 9, 'That writing habit you started? Still going strong. You''re on day 2,847. Who''s counting? You are.'),
('Taurus', 10, 'Your sentences are like a fine wine: they get better with age, revision, and being left alone for a while.'),
('Taurus', 11, 'Today you''ll defend the word "whom" to someone who says it''s archaic. They''re wrong and probably broke.'),
('Taurus', 12, 'Your bookmark is still on page 73 where it''s been for three months. You''ll return when you''re ready.'),
('Taurus', 13, 'The phrase "good enough" does not exist in your editorial vocabulary. It''s perfect or it''s trash.'),
('Taurus', 14, 'You have strong feelings about font choices. Times New Roman is your ride-or-die.'),
('Taurus', 15, 'Your writing desk setup is immaculate. That $200 ergonomic pen is finally paying dividends.'),
('Taurus', 16, 'Today''s fortune: Your attention to detail will catch a typo that everyone else missed. You''ll say nothing but judge silently.'),
('Taurus', 17, 'You''ll begin a sentence with "Well, actually..." and deliver a five-minute lecture on etymology. People will pretend to leave.'),
('Taurus', 18, 'Your reading nook has better ambiance than most restaurants. You''ve made sure of it.'),
('Taurus', 19, 'The compound-complex sentence is your natural habitat. Simple sentences bore you.'),
('Taurus', 20, 'You''ve owned the same dictionary since college. It''s broken in perfectly now.'),
('Taurus', 21, 'Today you''ll describe something as "luxurious" when you mean "it has semicolons."'),
('Taurus', 22, 'Your rough draft is everyone else''s final draft. You can''t help having standards.'),
('Taurus', 23, 'The universe blesses your stubborn refusal to adopt new slang. "Fleek" will never pass your lips.'),
('Taurus', 24, 'You''re still bitter about Pluto losing planet status and the dictionary adding "literally" as its own antonym.'),
('Taurus', 25, 'Your writing playlist hasn''t changed in six years. If it ain''t baroque, don''t fix it.'),
('Taurus', 26, 'Today you''ll finish a sentence with a preposition and feel physically ill about it.'),
('Taurus', 27, 'That leather-bound journal you bought? Still too beautiful to write in. Maybe next year.'),
('Taurus', 28, 'Your reading pace is "leisurely with extended snack breaks." The stars support this.'),
('Taurus', 29, 'You''ll use "indubitably" in a sentence today and mean it sincerely.'),
('Taurus', 30, 'The phrase "rushed prose" makes you break out in hives. Take your time; they can wait.');

-- Gemini (30 horoscopes)
INSERT INTO horoscopes (sign, horoscope_number, text) VALUES
('Gemini', 1, 'You''ll start three different books today and be equally invested in all of them. Commitment is a social construct.'),
('Gemini', 2, 'Your autocorrect has multiple personality disorder from keeping up with your mood-dependent vocabulary.'),
('Gemini', 3, 'Today you''ll use a word correctly in context without knowing its definition. Your intuitive linguistic abilities are showing.'),
('Gemini', 4, 'The dash—both em and en—and the semicolon; all your favorite punctuation, used interchangeably and incorrectly with confidence.'),
('Gemini', 5, 'You''re fluent in three languages but can''t remember any vocabulary in the moment you need it.'),
('Gemini', 6, 'Your group chat contains 17 half-finished thoughts. You''ll add three more today.'),
('Gemini', 7, 'The word "brevity" means nothing to you. Neither does "focus." You''ve already stopped reading this.'),
('Gemini', 8, 'Today you''ll argue both sides of a grammar debate so convincingly that everyone forgets what the original question was.'),
('Gemini', 9, 'Your browser has 47 tabs open, each containing a different article you''re "reading."'),
('Gemini', 10, 'You''ll discover a new word today, use it obsessively for three hours, then completely forget it exists.'),
('Gemini', 11, 'Mercury in retrograde is your natural state. Communication chaos is your comfort zone.'),
('Gemini', 12, 'Your writing style changes based on who you''re texting. You contain multitudes.'),
('Gemini', 13, 'Today''s horoscope comes in two parts because one perspective simply isn''t enough for you.'),
('Gemini', 14, 'You''ll start a text with "long story short" and then proceed to make it longer.'),
('Gemini', 15, 'The ellipsis is your emotional support punctuation... you use it everywhere... even when unnecessary...'),
('Gemini', 16, 'Your vocabulary switches between Victorian romance novel and modern memes with no transition.'),
('Gemini', 17, 'You''ve convinced yourself you''re bilingual because you can switch between American and British spelling.'),
('Gemini', 18, 'Today you''ll read the end of the book first, then the middle, then decide whether the beginning is worth it.'),
('Gemini', 19, 'Your notes app contains 392 unfinished thoughts. Today you''ll add 15 more.'),
('Gemini', 20, 'The phrase "as I was saying" appears in your speech three times per conversation because you keep interrupting yourself.'),
('Gemini', 21, 'You''ll use air quotes audibly in your writing today. People can hear them.'),
('Gemini', 22, 'Your autobiography will be titled "I Digress: A Collection of Tangents."'),
('Gemini', 23, 'Today you''ll explain something using an analogy that requires three sub-analogies to understand.'),
('Gemini', 24, 'You speak in parentheses (which is to say (you have thoughts within thoughts (it''s exhausting (but also exhilarating)))).'),
('Gemini', 25, 'Your reading list has 286 books. You''ll add 12 more today and read parts of 4.'),
('Gemini', 26, 'The word "multitasking" was invented to describe your reading habits specifically.'),
('Gemini', 27, 'You''ll start a sentence in one genre and end it in another. This is called "range."'),
('Gemini', 28, 'Today''s text messages will contain more questions than statements? Or will they. Or will they?'),
('Gemini', 29, 'You''ve mastered the art of switching topics mid-sentence and nobody expects—oh, did you see that new trailer?'),
('Gemini', 30, 'Your horoscope is whatever you decide it means because you''ve already reinterpreted it three different ways.');

-- Cancer (30 horoscopes)
INSERT INTO horoscopes (sign, horoscope_number, text) VALUES
('Cancer', 1, 'You''ve kept every love letter, grocery list, and Post-it note from 1997. Today you''ll reread them all emotionally.'),
('Cancer', 2, 'Your favorite punctuation is the ellipsis... because it leaves room for feelings...'),
('Cancer', 3, 'That bookmark from your childhood library still makes you tear up. The stars understand.'),
('Cancer', 4, 'Today you''ll write something so emotionally vulnerable that you''ll delete it and lie awake thinking about it.'),
('Cancer', 5, 'Your diary entries have diary entries. It''s memories all the way down.'),
('Cancer', 6, 'The word "nostalgia" was invented to describe your relationship with adverbs from your youth.'),
('Cancer', 7, 'You still have your first book report from third grade. It''s in a protective sleeve. Obviously.'),
('Cancer', 8, 'Today''s writing will be interrupted by three emotional tangents about that teacher who believed in you.'),
('Cancer', 9, 'Your reading nook is less a place and more an emotional support sanctuary lined with memory-soaked paperbacks.'),
('Cancer', 10, 'The phrase "as I remember it" prefaces 80% of your stories. Memory is subjective and you''re protecting it.'),
('Cancer', 11, 'You''ll cry about a metaphor today. Not because it''s sad, but because it understands you.'),
('Cancer', 12, 'Your comfort book has been read so many times the spine is held together by emotional attachment.'),
('Cancer', 13, 'Today you''ll use "home" as a verb, noun, adjective, and feeling simultaneously.'),
('Cancer', 14, 'The margins of your books contain more emotional commentary than the actual text.'),
('Cancer', 15, 'You''ve memorized the introduction to your favorite book because it feels like coming home.'),
('Cancer', 16, 'Today''s fortune: Someone will understand your obscure literary reference and you''ll immediately bond for life.'),
('Cancer', 17, 'Your vocabulary is 70% emotion-based adjectives. The other 30% is food metaphors.'),
('Cancer', 18, 'You''ll describe a sentence as "tender" today and everyone will know exactly what you mean.'),
('Cancer', 19, 'The phrase "it reminds me of..." starts all your sentences. Everything is connected to everything.'),
('Cancer', 20, 'Your book collection is organized by emotional significance, not alphabetically. The Dewey Decimal System could never.'),
('Cancer', 21, 'Today you''ll get misty-eyed over correct comma placement. It just feels so right.'),
('Cancer', 22, 'You''ve written 47 poems you''ll never show anyone. They live in a special folder labeled "PRIVATE - FOR ME."'),
('Cancer', 23, 'The word "bittersweet" appears in your vocabulary more than any other sign. It''s your emotional home base.'),
('Cancer', 24, 'Today you''ll use a vintage word because your grandmother used to use it and it just hits different.'),
('Cancer', 25, 'Your autocorrect has learned to add heart emojis automatically because you do it anyway.'),
('Cancer', 26, 'The universe says today is a good day to journal about your feelings. So, a normal day.'),
('Cancer', 27, 'You''ll save a text message today because it made you feel seen. Your archive is massive.'),
('Cancer', 28, 'That book your mom read to you in 1989? Still your metric for good writing.'),
('Cancer', 29, 'Today''s mantra: "I feel, therefore I am extremely articulate about those feelings."'),
('Cancer', 30, 'You''re not crying about that poem; you''re just hydrating your emotional vocabulary.');

-- Leo (30 horoscopes)
INSERT INTO horoscopes (sign, horoscope_number, text) VALUES
('Leo', 1, 'Today you''ll use ALL CAPS and everyone will understand it''s important because YOU''RE saying it.'),
('Leo', 2, 'The exclamation point exists solely for Leos! Everything you write deserves one! Or twelve!'),
('Leo', 3, 'Your signature is more elaborate than most people''s entire handwriting. This is appropriate.'),
('Leo', 4, 'Today''s fortune: Your main character energy will leak into your prose. Let it.'),
('Leo', 5, 'The word "humble" is not in your dictionary. You checked. Twice.'),
('Leo', 6, 'You''ll describe yourself as "eloquent" today and you won''t be wrong. Confidence is grammar.'),
('Leo', 7, 'Your email signature contains three inspirational quotes, all written by you.'),
('Leo', 8, 'The spotlight follows your cursor. Even your typos are somehow charismatic.'),
('Leo', 9, 'Today you''ll use the phrase "as I brilliantly stated earlier" without a trace of irony.'),
('Leo', 10, 'Your font size is always two points larger than requested. Presence matters.'),
('Leo', 11, 'The royal "we" isn''t pretentious when you use it. You ARE the main character.'),
('Leo', 12, 'Today''s writing will include at least five references to your own achievements. Naturally.'),
('Leo', 13, 'You''ve workshopped your opening line 47 times because first impressions are everything.'),
('Leo', 14, 'Your reading recommendations come with the phrase "it''s not as good as what I would''ve written, but..."'),
('Leo', 15, 'The word "understated" makes you physically uncomfortable. Go big or go home.'),
('Leo', 16, 'Today you''ll bold, italicize, AND underline the same word for emphasis. It deserves the attention.'),
('Leo', 17, 'Your vocabulary is 60% theatrical, 30% regal, and 10% stage directions.'),
('Leo', 18, 'You''ll introduce yourself in the third person today. [Your name] sees no issue with this.'),
('Leo', 19, 'That novel you''re writing? It''s "semi-autobiographical" which means it''s a biography.'),
('Leo', 20, 'The phrase "enough about me" has never actually preceded you talking about anything else.'),
('Leo', 21, 'Today''s texts will be perfectly punctuated because you''re not an animal. Standards matter.'),
('Leo', 22, 'Your favorite literary device is the spotlight metaphor. For obvious reasons.'),
('Leo', 23, 'You''ll workshop this horoscope in your head and decide you could''ve written it better.'),
('Leo', 24, 'The universe declares you the protagonist of your own story. You already knew.'),
('Leo', 25, 'Today you''ll use "magnificent" to describe your paragraph structure. You''re not wrong.'),
('Leo', 26, 'Your dramatic pauses have dramatic pauses. This is called "range."'),
('Leo', 27, 'You''ve referred to your writing process as "creating art" unironically. The stars approve.'),
('Leo', 28, 'Today''s mantra: "I don''t have a big vocabulary; I have the PERFECT vocabulary."'),
('Leo', 29, 'Someone will call you dramatic today. You''ll take it as a compliment. Because it is.'),
('Leo', 30, 'Your horoscope is longer than everyone else''s because you deserve more words.');

-- Virgo (30 horoscopes)
INSERT INTO horoscopes (sign, horoscope_number, text) VALUES
('Virgo', 1, 'You''ve spotted a typo in this horoscope already. You''re not wrong, but you''re exhausting.'),
('Virgo', 2, 'Today you''ll find three grammar errors in a published article and your day will be ruined.'),
('Virgo', 3, 'The serial comma isn''t optional. It''s mandatory. You''ll die on this hill. Today.'),
('Virgo', 4, 'Your internal editor has an internal editor. Both are judging this sentence structure.'),
('Virgo', 5, 'You''ve mentally corrected seventeen things already today and it''s only 9 AM.'),
('Virgo', 6, 'Today''s fortune: You''ll use "whom" correctly in casual conversation and feel superior about it.'),
('Virgo', 7, 'The phrase "good enough" causes you physical pain. There''s always one more revision.'),
('Virgo', 8, 'Your reading experience is 50% reading, 50% annotating errors in the margins with increasing frustration.'),
('Virgo', 9, 'You''ve researched the correct usage of "further" vs. "farther" for the 47th time just to be sure.'),
('Virgo', 10, 'Today you''ll reorganize your bookshelf by a system only you understand. It''s perfect.'),
('Virgo', 11, 'The word "literally" being misused will raise your blood pressure three times today.'),
('Virgo', 12, 'Your autocorrect has given up and just lets you manually fix everything. As it should.'),
('Virgo', 13, 'Today you''ll start a sentence, delete it, rewrite it, delete it again, and then restore the original. Growth.'),
('Virgo', 14, 'The universe acknowledges your correct use of apostrophes. Someone has to maintain standards.'),
('Virgo', 15, 'You''ve color-coded your notes by importance, topic, and emotional resonance. Obviously.'),
('Virgo', 16, 'Today''s horoscope: Your attention to detail will catch something everyone else missed. You won''t be thanked.'),
('Virgo', 17, 'The phrase "close enough" is violence to your ears. Nothing is close enough. It''s either right or wrong.'),
('Virgo', 18, 'You''ll spend 15 minutes deciding between "said" and "stated" today. This is time well spent.'),
('Virgo', 19, 'Your proofreading has proofreading. It''s called being thorough.'),
('Virgo', 20, 'Today you''ll mentally diagram a sentence someone said out loud. The structure was offensive.'),
('Virgo', 21, 'The word "irregardless" makes you irrationally angry. Actually, the anger is perfectly rational.'),
('Virgo', 22, 'Your first draft is everyone else''s tenth draft. This isn''t bragging; it''s just efficiency.'),
('Virgo', 23, 'Today you''ll reorganize your document formatting for optimal readability. Again.'),
('Virgo', 24, 'The stars say you''ll encounter a dangling modifier today. You''ll fix it before anyone notices.'),
('Virgo', 25, 'Your vocabulary is precise, exact, accurate, and correct. Synonyms exist for a reason.'),
('Virgo', 26, 'Today''s reading will be interrupted by your need to verify a fact. Three sources minimum.'),
('Virgo', 27, 'You''ve created a spreadsheet for tracking your reading goals. It has conditional formatting.'),
('Virgo', 28, 'The phrase "I''m being pedantic" doesn''t offend you. Someone has to be.'),
('Virgo', 29, 'Today you''ll use "i.e." and "e.g." correctly while everyone else uses them interchangeably like heathens.'),
('Virgo', 30, 'Your horoscope is error-free because you''ve already proofread it six times in your mind.');

-- Libra (30 horoscopes)
INSERT INTO horoscopes (sign, horoscope_number, text) VALUES
('Libra', 1, 'You''ll use "on the other hand" four times in one paragraph today. Balance is key.'),
('Libra', 2, 'Your sentences are so diplomatic they''ve been nominated for peace prizes.'),
('Libra', 3, 'Today you''ll spend 20 minutes choosing between two equally good synonyms. Both are perfect. This is torture.'),
('Libra', 4, 'The semicolon is your spirit punctuation; it connects two independent clauses while maintaining their equality.'),
('Libra', 5, 'Your horoscope comes in two parts because you see both sides of everything.'),
('Libra', 6, 'Today''s fortune: You''ll rewrite a sentence eight times trying to make it fair to all perspectives.'),
('Libra', 7, 'The phrase "it depends" starts 90% of your sentences. Context matters.'),
('Libra', 8, 'You''ll use "however" and "nevertheless" in the same sentence today because balance requires both conjunction and contrast.'),
('Libra', 9, 'Your reading list is perfectly curated to represent all genres equally. Except you can''t decide which to read first.'),
('Libra', 10, 'Today you''ll argue both sides of an Oxford comma debate and convince yourself of both positions.'),
('Libra', 11, 'Your font choice will take longer than writing the actual document. Aesthetics require deliberation.'),
('Libra', 12, 'The word "perhaps" is your verbal safety net. Commitment is terrifying.'),
('Libra', 13, 'Today you''ll write "yes, but also no" and mean it completely.'),
('Libra', 14, 'Your vocabulary is 70% qualifiers and 30% equivocating phrases. This is thoughtful, not indecisive.'),
('Libra', 15, 'You''ll revise a text message for tone balance seven times before sending. Communication is an art.'),
('Libra', 16, 'The universe supports your need to present multiple perspectives. Even when no one asked.'),
('Libra', 17, 'Today''s writing will include the phrase "to be fair" at least twelve times. Fairness demands it.'),
('Libra', 18, 'Your book recommendations come with equal praise and criticism. No bias here.'),
('Libra', 19, 'You''ll start a sentence with "I see what you''re saying, and..." then present the opposite view for twenty minutes.'),
('Libra', 20, 'Today you''ll use "conversely" in casual conversation. Balance requires formal conjunction.'),
('Libra', 21, 'Your sentences have more clauses than a legal contract. This ensures fairness to all parties (grammatical and otherwise).'),
('Libra', 22, 'The phrase "both/and" rather than "either/or" is your life philosophy and writing style.'),
('Libra', 23, 'Today you''ll rewrite something to be more neutral and somehow make it less clear. This is growth.'),
('Libra', 24, 'Your indecision between active and passive voice has led to innovative hybrid constructions.'),
('Libra', 25, 'You''ll spend today weighing the merits of two different writing styles. Next week you''ll choose neither and go with a third option.'),
('Libra', 26, 'The stars say you''ll use "one could argue" today, followed immediately by arguing the opposite.'),
('Libra', 27, 'Your texts are perfectly balanced with just the right emoji-to-word ratio. You''ve calculated it.'),
('Libra', 28, 'Today''s mantra: "This sentence is good, but what if I completely rewrote it in a different tone?"'),
('Libra', 29, 'You''ll end a debate today with "both perspectives have valid points" and everyone will be unsatisfied but you''ll feel centered.'),
('Libra', 30, 'Your horoscope could go either way. And it does. And that''s beautiful.');

-- Scorpio (30 horoscopes)
INSERT INTO horoscopes (sign, horoscope_number, text) VALUES
('Scorpio', 1, 'Today you''ll use subtext so layered that only you know what you really meant. Perfect.'),
('Scorpio', 2, 'Your passive-aggressive email sign-off is a work of art. "Best," indeed.'),
('Scorpio', 3, 'The word "secrets" appears in your vocabulary more than any other sign. You''ll never tell why.'),
('Scorpio', 4, 'Today''s fortune: Your reading between the lines will uncover something everyone else missed. As usual.'),
('Scorpio', 5, 'You''ll write something so cryptic today that future you won''t even remember what it meant.'),
('Scorpio', 6, 'Your marginalia is more interesting than the actual book. And significantly darker.'),
('Scorpio', 7, 'The ellipsis is your weapon of choice... you know what you did...'),
('Scorpio', 8, 'Today you''ll use a period instead of an exclamation point and everyone will know you''re furious.'),
('Scorpio', 9, 'Your vocabulary includes seventeen different ways to say "revenge" with increasing specificity.'),
('Scorpio', 10, 'The phrase "I''m fine" in your texts carries more weight than most people''s entire emotional vocabulary.'),
('Scorpio', 11, 'Today you''ll remember something someone said three years ago and finally understand what they really meant. The long game.'),
('Scorpio', 12, 'Your password contains references only you understand and probably a Latin phrase about retribution.'),
('Scorpio', 13, 'The word "trust" appears in your writing with quotation marks around it. Always.'),
('Scorpio', 14, 'Today''s texts will be timed for maximum psychological impact. You know when they''re awake.'),
('Scorpio', 15, 'You''ve analyzed the subtext of this horoscope and found three hidden meanings. Two of them are actually there.'),
('Scorpio', 16, 'The universe acknowledges your ability to hold a grudge in grammatically perfect sentences.'),
('Scorpio', 17, 'Today you''ll use italics for emphasis but really you''re emphasizing the unspoken threat beneath the words.'),
('Scorpio', 18, 'Your book collection includes twelve books on psychological warfare disguised as "communication guides."'),
('Scorpio', 19, 'The phrase "interesting choice" in your vocabulary has never been a compliment.'),
('Scorpio', 20, 'Today you''ll write something so loaded with double meaning that it''s essentially triple meaning.'),
('Scorpio', 21, 'Your favorite literary device is dramatic irony. You know what everyone else doesn''t.'),
('Scorpio', 22, 'You''ll use "noted" as a complete sentence today. It will be devastating.'),
('Scorpio', 23, 'The word "loyal" means something different to you than to other signs. Deeper. Darker. More eternal.'),
('Scorpio', 24, 'Today''s fortune: Someone will underestimate you based on your quiet intensity. They''ll learn.'),
('Scorpio', 25, 'Your reading face reveals nothing, but your annotations reveal everything. Good thing no one sees them.'),
('Scorpio', 26, 'You''ll describe something as "fascinating" today in a tone that makes it sound like a death sentence.'),
('Scorpio', 27, 'The phrase "we need to talk" gives you energy while draining everyone else. This is your power.'),
('Scorpio', 28, 'Today you''ll spot the hidden message in someone''s casual text. You always do.'),
('Scorpio', 29, 'Your horoscope is shorter than others because you prefer mystery. Say less, mean more.'),
('Scorpio', 30, 'The stars know you''ve already decoded what they''re really saying. Respect.');

-- Sagittarius (30 horoscopes)
INSERT INTO horoscopes (sign, horoscope_number, text) VALUES
('Sagittarius', 1, 'Today you''ll start telling a story and somehow end up explaining the philosophy of language. Nobody''s surprised.'),
('Sagittarius', 2, 'Your text messages are either one word or 847 words. There is no in-between.'),
('Sagittarius', 3, 'The word "technically" prefaces 60% of your corrections. Accuracy with attitude.'),
('Sagittarius', 4, 'Today''s fortune: You''ll accidentally insult someone by being too honest about their writing. You won''t apologize.'),
('Sagittarius', 5, 'Your vocabulary includes obscure words from seven languages because you picked them up while backpacking through your reading list.'),
('Sagittarius', 6, 'You''ll use air quotes sarcastically today in a way that offends everyone. Mission accomplished.'),
('Sagittarius', 7, 'The phrase "well, actually" is your conversational opening 90% of the time. Truth doesn''t worry about social niceties.'),
('Sagittarius', 8, 'Today you''ll read the end of the book first because life''s too short for narrative suspense.'),
('Sagittarius', 9, 'Your horoscope is blunt: you talk too much and nobody asked, but your stories are entertaining so we allow it.'),
('Sagittarius', 10, 'You''ve DNF''d seventeen books this month. Life''s too short for boring prose.'),
('Sagittarius', 11, 'Today you''ll make an uncomfortably accurate observation about someone''s writing style. You''re not wrong, but timing isn''t your strength.'),
('Sagittarius', 12, 'The word "theoretically" lets you argue about anything without committing to any position. Use it liberally.'),
('Sagittarius', 13, 'Your reading pace is "speed through it while traveling through three airports."'),
('Sagittarius', 14, 'Today''s texts will include at least one unsolicited philosophical tangent. Your friends expect nothing less.'),
('Sagittarius', 15, 'You''ll describe something as "objectively" true while stating a subjective opinion. The irony is lost on you.'),
('Sagittarius', 16, 'The universe supports your need to debate the meaning of every word choice. Even when it derails the conversation.'),
('Sagittarius', 17, 'Today you''ll use a foreign phrase in English conversation and not translate it. Either they know or they don''t.'),
('Sagittarius', 18, 'Your book recommendations come with the caveat "if you can handle the truth." Most people can''t.'),
('Sagittarius', 19, 'You''ll start three arguments today by pointing out logical fallacies in casual conversation. Worth it.'),
('Sagittarius', 20, 'The phrase "to be honest" implies you''re sometimes dishonest. You use it anyway because it sounds good.'),
('Sagittarius', 21, 'Today''s fortune: Your brutal honesty will be called "refreshing" by one person and "rude" by everyone else.'),
('Sagittarius', 22, 'Your vocabulary is 40% borrowed from other languages, 30% philosophical terms, and 30% exaggeration for effect.'),
('Sagittarius', 23, 'You''ll use "literally" correctly today and then immediately use it incorrectly for emphasis. Growth is optional.'),
('Sagittarius', 24, 'The word "adventure" applies to both world travel and finally finishing that book series. Same energy.'),
('Sagittarius', 25, 'Today you''ll interrupt someone''s story to correct a factual detail. The story will never recover.'),
('Sagittarius', 26, 'Your reading list includes dense philosophy books you''ll never finish and beach reads you''ll devour in two hours.'),
('Sagittarius', 27, 'You''ll describe yourself as "direct" today when everyone else would say "tactless." Tomato, tomahto.'),
('Sagittarius', 28, 'The stars say you''ll overshare in a text today and immediately follow up with "anyway" and change subjects.'),
('Sagittarius', 29, 'Today''s mantra: "Why say something nice when you could say something accurate?"'),
('Sagittarius', 30, 'Your horoscope is honest: you''re exhausting but at least you''re interesting.');

-- Capricorn (30 horoscopes)
INSERT INTO horoscopes (sign, horoscope_number, text) VALUES
('Capricorn', 1, 'Today you''ll schedule time for spontaneous creativity. The irony is lost on you.'),
('Capricorn', 2, 'Your vocabulary includes phrases like "actionable items" and "deliverables" even in personal emails. Professionalism has no off switch.'),
('Capricorn', 3, 'The word "efficient" is your highest compliment. A well-structured sentence makes you emotional.'),
('Capricorn', 4, 'Today''s fortune: You''ll create a spreadsheet to track your reading goals. It will have multiple tabs.'),
('Capricorn', 5, 'Your texts are formatted like business emails. "Dear [Name], Per our conversation..." It''s a text to your mom.'),
('Capricorn', 6, 'You''ve calculated the ROI on your vocabulary expansion efforts. The metrics are promising.'),
('Capricorn', 7, 'Today you''ll use "synergy" unironically in a sentence about your personal writing projects.'),
('Capricorn', 8, 'The phrase "let''s circle back" has entered your casual vocabulary. The stars are concerned.'),
('Capricorn', 9, 'Your reading time is scheduled in your calendar with buffer time for notes. Obviously.'),
('Capricorn', 10, 'Today you''ll judge someone''s credibility based on their grammar. This is called discernment.'),
('Capricorn', 11, 'The word "deadline" excites you more than it should. Structure is your love language.'),
('Capricorn', 12, 'You''ve outlined your novel using project management software. Chapter milestones are color-coded.'),
('Capricorn', 13, 'Today''s horoscope: Your ambition will manifest as alphabetizing your spice rack and your bookshelf simultaneously.'),
('Capricorn', 14, 'Your password hasn''t changed in five years. Why fix what follows protocol?'),
('Capricorn', 15, 'You''ll use "per my previous message" today. It will be devastating. And grammatically flawless.'),
('Capricorn', 16, 'The universe acknowledges your use of "strategic" to describe your book buying habits. Invest in knowledge.'),
('Capricorn', 17, 'Today you''ll apply SMART goals to your reading list. Books don''t read themselves through poor planning.'),
('Capricorn', 18, 'Your vocabulary is 50% business jargon, 40% classical references, and 10% secret dad jokes you''d never admit to.'),
('Capricorn', 19, 'The phrase "work smarter, not harder" applies to your writing process. Templates are efficient.'),
('Capricorn', 20, 'Today you''ll revise something to be more "professional" which means removing all personality. Success.'),
('Capricorn', 21, 'Your book notes have a table of contents. And footnotes. And an appendix.'),
('Capricorn', 22, 'You''ve created a style guide for your personal writing. Consistency is key.'),
('Capricorn', 23, 'Today''s fortune: Someone will call you "intense." You''ll add it to your LinkedIn profile as a skill.'),
('Capricorn', 24, 'The word "legacy" appears in your vocabulary when discussing your contribution to the group chat.'),
('Capricorn', 25, 'You''ll measure your productivity today by word count. Numbers don''t lie.'),
('Capricorn', 26, 'Today you''ll use "optimize" in reference to your morning reading routine. The efficiency gains are substantial.'),
('Capricorn', 27, 'Your New Year''s resolution from 2019 is still being tracked. Progress is linear.'),
('Capricorn', 28, 'The stars say you''ll achieve inbox zero today. This is more satisfying than most people''s entire life goals.'),
('Capricorn', 29, 'Today''s mantra: "Discipline equals freedom, and perfect grammar equals respect."'),
('Capricorn', 30, 'Your horoscope is results-oriented: You''ll accomplish something today and document it properly.');

-- Aquarius (30 horoscopes)
INSERT INTO horoscopes (sign, horoscope_number, text) VALUES
('Aquarius', 1, 'Today you''ll invent a new word and use it confidently without defining it. Language is evolution.'),
('Aquarius', 2, 'Your vocabulary includes terms you learned from sci-fi novels that don''t technically exist yet. You''re ahead of the curve.'),
('Aquarius', 3, 'The word "conventional" makes you break out in hives. Today you''ll use a punctuation mark incorrectly just to see what happens.'),
('Aquarius', 4, 'Your horoscope is written in a font you don''t recognize. Perfect.'),
('Aquarius', 5, 'Today you''ll argue that all grammar rules are social constructs. You''re not wrong, but you''re alone at this party.'),
('Aquarius', 6, 'The phrase "why not" justifies 80% of your creative choices. The stars support this chaos.'),
('Aquarius', 7, 'You''ll use a colon in a way that no style guide has ever sanctioned: and you''ll make it work: somehow:'),
('Aquarius', 8, 'Today''s fortune: Your unconventional metaphor will confuse everyone but one person will call it "genius." Sufficient.'),
('Aquarius', 9, 'Your reading list includes six books that haven''t been written yet. You''re manifesting through TBR lists.'),
('Aquarius', 10, 'You''ve decided that paragraphs are limiting. Today''s writing will be one continuous stream of consciousness with arbitrary line breaks.'),
('Aquarius', 11, 'The word "normal" is not in your vocabulary. You checked. You also checked the thesaurus for synonyms to avoid.'),
('Aquarius', 12, 'Today you''ll start a sentence with a conjunction because rules are suggestions and you''re above suggestions.'),
('Aquarius', 13, 'Your texts contain neologisms your autocorrect has given up trying to fix. You''re creating tomorrow''s dictionary today.'),
('Aquarius', 14, 'The phrase "that''s not how that works" only encourages you. Watch how it works now.'),
('Aquarius', 15, 'Today you''ll use a semicolon where no semicolon has gone before; the grammar gods are concerned but intrigued.'),
('Aquarius', 16, 'Your book annotations include futuristic theories about language that won''t be relevant for another century. Patience.'),
('Aquarius', 17, 'The universe acknowledges your refusal to follow trending hashtags. You''ll start your own that never trends. This is integrity.'),
('Aquarius', 18, 'Today you''ll describe your writing style as "post-structural experimental minimalism" when really you just don''t like capitals.'),
('Aquarius', 19, 'Your vocabulary is 60% borrowed from future slang, 30% archaic terms you''re reviving, and 10% words you made up last Tuesday.'),
('Aquarius', 20, 'You''ll use "literally" to mean "figuratively" today, but with such conviction that you''re reinventing the definition. Again.'),
('Aquarius', 21, 'Today''s horoscope: You''ll have a revelation about the arbitrary nature of spelling. This will not go well in emails.'),
('Aquarius', 22, 'The word "mainstream" is your villain origin story. Your writing style proves it.'),
('Aquarius', 23, 'You''ve rejected the premise of this horoscope on principle. The stars respect this.'),
('Aquarius', 24, 'Today you''ll communicate an idea so ahead of its time that everyone thinks you had a typo. Let them think that.'),
('Aquarius', 25, 'Your favorite author is someone who won''t be famous for another decade. You found them first.'),
('Aquarius', 26, 'The phrase "everyone else is doing it" guarantees you''ll do the opposite. This includes grammar conventions.'),
('Aquarius', 27, 'Today you''ll use emoji as punctuation and defend it as linguistic evolution. You''re technically right.'),
('Aquarius', 28, 'Your reading pace is "non-linear with intentional digressions." Time is a construct.'),
('Aquarius', 29, 'You''ll invent a new genre today by combining three genres that shouldn''t work together. It works.'),
('Aquarius', 30, 'Today''s mantra: "If language is alive, I''m giving it a very strange life." The universe nods knowingly.');

-- Pisces (30 horoscopes)
INSERT INTO horoscopes (sign, horoscope_number, text) VALUES
('Pisces', 1, 'Today you''ll start a sentence and drift into a dreamlike description that loses the original point entirely. This is called poetry.'),
('Pisces', 2, 'Your texts take 20 minutes to send because you keep adding "wait, one more thing..." The universe supports this.'),
('Pisces', 3, 'The word "practically" does a lot of heavy lifting in your vocabulary because reality is negotiable.'),
('Pisces', 4, 'Today''s fortune: You''ll describe something as "giving liminal space vibes" and everyone will nod despite understanding nothing.'),
('Pisces', 5, 'Your horoscope is blurry around the edges, much like your concept of deadlines.'),
('Pisces', 6, 'You''ll use the ellipsis emotionally today... not grammatically... there''s a difference... you can feel it...'),
('Pisces', 7, 'The phrase "I had the strangest dream" starts half your stories. The other half are about equally strange waking experiences.'),
('Pisces', 8, 'Today you''ll read the same paragraph six times, not because it''s confusing, but because you''re savoring the metaphors.'),
('Pisces', 9, 'Your book is waterlogged because you read in the bath and lost track of time. The stars saw this coming.'),
('Pisces', 10, 'The word "ethereal" appears in your vocabulary more than most people''s entire emotional lexicon.'),
('Pisces', 11, 'Today you''ll use "vibes" as both subject and predicate. Grammatically questionable, spiritually accurate.'),
('Pisces', 12, 'Your writing flows like water: it goes everywhere, avoids hard edges, and somehow ends up where it started.'),
('Pisces', 13, 'The universe notes you''ve confused "reality" with "the thing I imagined might be reality" again. We''ve been over this.'),
('Pisces', 14, 'Today you''ll start crying about a sentence and won''t be able to explain why. The rhythm just hit different.'),
('Pisces', 15, 'Your texts contain more em dashes than periods because your thoughts flow together like rivers—endless and meandering—without clear boundaries.'),
('Pisces', 16, 'The phrase "I''m almost done" means you haven''t started yet but you''ve visualized the finished product. Close enough.'),
('Pisces', 17, 'Today you''ll describe your mood using a color that isn''t on the spectrum. People will understand anyway.'),
('Pisces', 18, 'Your reading comprehension is excellent but your timeline comprehension is fantasy. Did you read that yesterday or last month? Who knows.'),
('Pisces', 19, 'The word "technically" is how you differentiate dreams from reality. "I didn''t technically finish that book" means you dreamed the ending.'),
('Pisces', 20, 'Today''s horoscope swims in circles, much like your approach to plot structure.'),
('Pisces', 21, 'You''ll use "feels" as a noun today and everyone will feel it.'),
('Pisces', 22, 'Your vocabulary is 70% emotional adjectives, 20% water metaphors, and 10% sounds that capture feelings words can''t reach.'),
('Pisces', 23, 'Today you''ll read an entire book and not remember a single plot point, but you''ll remember exactly how it made you feel.'),
('Pisces', 24, 'The phrase "I feel like" prefaces statements that are objectively verifiable. Feelings are facts in Pisces land.'),
('Pisces', 25, 'You''ll start a text, get distracted by your own thoughts, and send it three hours later with no explanation. They''ll understand.'),
('Pisces', 26, 'Today''s fortune: Your intuitive grasp of metaphor will create a sentence so layered it becomes architecture.'),
('Pisces', 27, 'The universe acknowledges you''ve been "about to start" that writing project for six months. The intention is beautiful.'),
('Pisces', 28, 'Your bookmark moves backward more often than forward because you keep rereading passages that resonated.'),
('Pisces', 29, 'Today you''ll describe something as "a whole mood" and use thirty adjectives to explain which mood specifically.'),
('Pisces', 30, 'Your horoscope dissolves at the edges because boundaries are illusions and so is punctuation if you believe hard enough.');

-- =====================================================
-- Migration complete!
-- =====================================================
