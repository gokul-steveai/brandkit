-- Seed library_personality_traits with 10 options
INSERT INTO public.library_personality_traits (title, description, tags, is_library, user_id, usage_count)
VALUES
  ('Innovative', 'Constantly pushing boundaries and embracing new ideas', ARRAY['creative', 'forward-thinking'], true, NULL, 0),
  ('Trustworthy', 'Reliable, honest, and transparent in all interactions', ARRAY['dependable', 'honest'], true, NULL, 0),
  ('Bold', 'Unafraid to take risks and challenge the status quo', ARRAY['courageous', 'daring'], true, NULL, 0),
  ('Approachable', 'Warm, friendly, and easy to connect with', ARRAY['welcoming', 'accessible'], true, NULL, 0),
  ('Sophisticated', 'Refined, elegant, and polished in presentation', ARRAY['elegant', 'premium'], true, NULL, 0),
  ('Playful', 'Fun, lighthearted, and not afraid to show personality', ARRAY['fun', 'energetic'], true, NULL, 0),
  ('Authoritative', 'Expert, knowledgeable, and commanding respect', ARRAY['expert', 'credible'], true, NULL, 0),
  ('Empathetic', 'Understanding, caring, and emotionally intelligent', ARRAY['compassionate', 'caring'], true, NULL, 0),
  ('Minimalist', 'Clean, simple, and focused on essentials', ARRAY['simple', 'clean'], true, NULL, 0),
  ('Rebellious', 'Challenging conventions and disrupting industries', ARRAY['disruptive', 'unconventional'], true, NULL, 0)
ON CONFLICT DO NOTHING;

-- Seed library_brand_values with 12 options
INSERT INTO public.library_brand_values (name, description, is_library, user_id, usage_count)
VALUES
  ('Integrity', 'We do what is right, even when no one is watching', true, NULL, 0),
  ('Innovation', 'We embrace change and continuously seek better solutions', true, NULL, 0),
  ('Customer First', 'Every decision starts with the customer in mind', true, NULL, 0),
  ('Excellence', 'We strive for the highest quality in everything we do', true, NULL, 0),
  ('Collaboration', 'We achieve more together than alone', true, NULL, 0),
  ('Transparency', 'We communicate openly and honestly', true, NULL, 0),
  ('Sustainability', 'We consider our impact on future generations', true, NULL, 0),
  ('Inclusivity', 'We celebrate diversity and create belonging for all', true, NULL, 0),
  ('Accountability', 'We own our actions and deliver on our promises', true, NULL, 0),
  ('Agility', 'We adapt quickly to changing circumstances', true, NULL, 0),
  ('Respect', 'We treat everyone with dignity and consideration', true, NULL, 0),
  ('Passion', 'We bring enthusiasm and dedication to our work', true, NULL, 0)
ON CONFLICT DO NOTHING;

-- Seed library_brand_principles with 10 options
INSERT INTO public.library_brand_principles (name, action, tag, use_case, is_library, user_id, usage_count)
VALUES
  ('Lead with Value', 'Always provide value before asking for anything', 'engagement', 'Content marketing and customer interactions', true, NULL, 0),
  ('Simplify Complexity', 'Make the complicated feel simple and accessible', 'communication', 'Product messaging and technical documentation', true, NULL, 0),
  ('Show, Don''t Tell', 'Demonstrate capabilities through examples and proof', 'credibility', 'Sales presentations and case studies', true, NULL, 0),
  ('Be Human', 'Connect authentically without corporate jargon', 'tone', 'All customer communications', true, NULL, 0),
  ('Respect Time', 'Value the audience''s time in every interaction', 'efficiency', 'Meetings, emails, and content creation', true, NULL, 0),
  ('Embrace Feedback', 'Welcome criticism as an opportunity to improve', 'growth', 'Customer service and product development', true, NULL, 0),
  ('Stay Curious', 'Continuously learn and question assumptions', 'innovation', 'Strategy and product development', true, NULL, 0),
  ('Deliver Consistently', 'Maintain quality and reliability across all touchpoints', 'trust', 'Brand experience and service delivery', true, NULL, 0),
  ('Think Long-term', 'Prioritize sustainable success over quick wins', 'strategy', 'Business decisions and partnerships', true, NULL, 0),
  ('Celebrate Others', 'Highlight customer and partner successes', 'community', 'Social media and testimonials', true, NULL, 0)
ON CONFLICT DO NOTHING;

-- Seed library_brand_moods with 12 options
INSERT INTO public.library_brand_moods (name, emotional_description, associated_tone, visual_descriptor, is_library, user_id, usage_count)
VALUES
  ('Confident', 'Self-assured and decisive without arrogance', 'Direct and assertive', 'Bold colors, strong typography', true, NULL, 0),
  ('Inspiring', 'Uplifting and motivating to action', 'Encouraging and visionary', 'Bright, aspirational imagery', true, NULL, 0),
  ('Calm', 'Peaceful and reassuring presence', 'Measured and soothing', 'Soft colors, open spaces', true, NULL, 0),
  ('Energetic', 'Dynamic and full of vitality', 'Enthusiastic and lively', 'Vibrant colors, movement', true, NULL, 0),
  ('Sophisticated', 'Cultured and refined elegance', 'Polished and articulate', 'Muted tones, classic design', true, NULL, 0),
  ('Friendly', 'Warm and welcoming to all', 'Conversational and inclusive', 'Warm colors, approachable visuals', true, NULL, 0),
  ('Professional', 'Competent and business-focused', 'Formal yet accessible', 'Clean lines, structured layouts', true, NULL, 0),
  ('Playful', 'Fun and lighthearted spirit', 'Witty and casual', 'Bright colors, whimsical elements', true, NULL, 0),
  ('Mysterious', 'Intriguing and thought-provoking', 'Subtle and evocative', 'Dark tones, dramatic contrast', true, NULL, 0),
  ('Trustworthy', 'Reliable and dependable presence', 'Honest and straightforward', 'Blues and greens, stable compositions', true, NULL, 0),
  ('Innovative', 'Forward-thinking and cutting-edge', 'Bold and future-focused', 'Modern design, tech-inspired', true, NULL, 0),
  ('Nostalgic', 'Warm connection to the past', 'Storytelling and reflective', 'Vintage aesthetics, warm tones', true, NULL, 0)
ON CONFLICT DO NOTHING;