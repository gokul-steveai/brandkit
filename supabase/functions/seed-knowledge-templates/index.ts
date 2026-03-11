import { createClient } from "npm:@supabase/supabase-js@2.87.1";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TEMPLATES = [
  {
    path: 'templates/negative-governance-dictionary.md',
    content: `# Negative Governance Dictionary

## Overview

This document defines language patterns, keywords, and phrases that AI should **never** generate when representing this brand. These are categorized by severity and type.

## Priority 1: Absolutely Banned (Hard Stop)

These phrases trigger immediate content rejection.

### Clichéd Openings

- "In today's world..."
- "In the ever-evolving landscape..."
- "As we navigate..."
- "In this day and age..."

### Corporate Jargon

- "Synergy" / "Synergize"
- "Leverage" (as a verb)
- "Circle back"
- "Touch base"
- "Move the needle"
- "Paradigm shift"
- "Low-hanging fruit"

### AI-Reveal Phrases

- "Delve" / "Delving"
- "Tapestry"
- "Landscape" (metaphorical)
- "Dive deep"
- "Unpack this"
- "At its core"

## Priority 2: Strongly Discouraged

Avoid unless contextually necessary.

### Filler Phrases

- "It's important to note that..."
- "It goes without saying..."
- "Needless to say..."
- "At the end of the day..."

### Vague Qualifiers

- "Very unique" (unique is absolute)
- "Fairly certain"
- "Basically"
- "Literally" (when not literal)

## Priority 3: Brand-Specific Avoidances

[Add brand-specific banned terms here]

## Enforcement

When generating content, cross-reference this dictionary before output. If a banned phrase is detected, rephrase using:

1. Concrete, specific language
2. Brand voice guidelines
3. Active voice alternatives
`
  },
  {
    path: 'templates/bias-ethics-audit-framework.md',
    content: `# Bias & Ethics Audit Framework

## Overview

This framework provides guidelines for auditing AI-generated content for bias, ethical concerns, and brand alignment.

## Audit Categories

### 1. Language Bias

- Gender-neutral language verification
- Cultural sensitivity checks
- Accessibility considerations
- Inclusive terminology

### 2. Ethical Guidelines

- Truthfulness in claims
- Transparency in AI disclosure
- Privacy considerations
- Fair representation

### 3. Brand Alignment

- Voice consistency
- Value alignment
- Message accuracy
- Tone appropriateness

## Audit Checklist

### Before Publication

- [ ] Content reviewed for discriminatory language
- [ ] Claims verified for accuracy
- [ ] Sources properly attributed
- [ ] AI disclosure included where required
- [ ] Accessibility standards met

### Quality Standards

- [ ] Meets brand voice guidelines
- [ ] Aligns with company values
- [ ] Appropriate for target audience
- [ ] Culturally sensitive

## Escalation Process

1. Flag content with concerns
2. Review with ethics committee
3. Document decision and rationale
4. Update guidelines if needed
`
  },
  {
    path: 'templates/anti-ai-patterns.md',
    content: `# Anti-AI Patterns: Language Guide

## Overview

A comprehensive list of words, phrases, and patterns commonly overused by AI that make content sound robotic, generic, or inauthentic. Use this as a negative prompt to ensure your brand's content maintains a human voice.

---

## Metadata

- **Template Type:** Governance / Negative Directory
- **Category:** Content Quality
- **Use Case:** AI content review, brand voice enforcement
- **Version:** 1.0

---

## 1. Connective Words Indicating Sequence or Addition

Words that create an overly formal, academic tone:

- Firstly
- Furthermore
- Additionally
- Moreover
- Also
- Subsequently
- As well as

---

## 2. Summarizing and Concluding Phrases

Phrases that telegraph AI-generated endings:

- In summary
- To summarize
- In conclusion
- Ultimately
- It's important to note
- It's worth noting that
- To put it simply

---

## 3. Comparative or Contrastive Words

Overused transitional phrases:

- Despite
- Even though
- Although
- On the other hand
- In contrast
- While
- Unless
- Even if

---

## 4. Specific and Detailed Reference

Academic-sounding callbacks:

- Specifically
- Remember that…
- As previously mentioned

---

## 5. Alternative Options or Suggestions

Hedging phrases:

- Alternatively
- You may want to

---

## 6. Action Words and Phrases (High Alert)

Dramatic verbs that scream AI:

- Embark
- Unlock the secrets
- Unveil the secrets
- Delve into
- Take a dive into
- Dive into
- Navigate
- Mastering
- Elevate
- Unleash
- Harness
- Enhance
- Revolutionize
- Foster

---

## 7. Quick Reference: Red Flag Words

If your paragraph has three or more of these, rewrite it:

- Delve
- Intricate
- Nuance
- Realm
- Moreover
- Catalyst
- Comprehensive
- Significant
- Enhance
- Crucial
- Vital
- Ever-evolving
- At the end of the day
- In conclusion

---

## 8. Problematic Vocabulary with Alternatives

| AI Word | Human Alternative |
|---------|-------------------|
| Leverage | use |
| Optimise | improve, refine |
| Facilitate | help |
| Implementation | putting into action, setup |
| Methodology | method, approach |
| Endeavour | effort, attempt |
| Utilisation | use |

---

## 9. Corporate Jargon to Avoid

| Jargon | Plain English |
|--------|---------------|
| Streamline operations | make work flow smoother |
| Drive synergies | work better together |
| Best-in-class solutions | top quality |
| Cutting-edge technology | latest tools |
| Scalable infrastructure | systems that grow with you |

---

## 10. Overused AI Transition Phrases

| Robotic | Human |
|---------|-------|
| Furthermore | And |
| Moreover | Also |
| Therefore | So |
| Consequently | Because of this |
| Subsequently | Next |
| Nonetheless | Still |

---

## 11. Dramatic Marketing Clichés

| Cliché | Better Alternative |
|--------|-------------------|
| Unlock the power of… | Make the most of… |
| Revolutionise the way… | Change how you… |
| Take your business to the next level | Help your business grow |
| Game-changing solution | Effective tool |
| Unparalleled excellence | Outstanding quality |

---

## 12. Weak, Hedging Qualifiers

Remove these entirely—they add nothing:

- It is important to note that…
- It should be mentioned that…
- One might argue that…
- It could be suggested that…

---

## Enforcement Guidelines

When reviewing AI-generated content:

1. **Scan** for any words/phrases from this list
2. **Count** occurrences—3+ is a red flag
3. **Replace** with simpler, more human alternatives
4. **Read aloud**—if it sounds robotic, rewrite it

---

## Remember

People want clarity, not buzzwords. Real humans don't talk like ad agencies or corporate memos. Write like you're explaining something to a friend over coffee.
`
  },
  {
    path: 'templates/brand-voice-consistency-checklist.md',
    content: `# Brand Voice Consistency Checklist

## Overview

A practical evaluation framework to ensure all content aligns with your brand's personality traits, tone, and communication style. Use this checklist before publishing any AI-generated or human-written content.

---

## Metadata

- **Template Type:** Quality Assurance
- **Category:** Brand Voice
- **Use Case:** Content review, brand alignment verification
- **Version:** 1.0

---

## Pre-Review Setup

Before evaluating content, have these references ready:

- [ ] Brand personality traits document
- [ ] Tone of voice guidelines
- [ ] Target audience personas
- [ ] Examples of approved brand content

---

## 1. Personality Trait Alignment

Does the content reflect your brand's core personality traits?

### Trait Verification

| Trait | Present? | Evidence |
|-------|----------|----------|
| [Trait 1] | Yes / No | Quote from content |
| [Trait 2] | Yes / No | Quote from content |
| [Trait 3] | Yes / No | Quote from content |

### Questions to Ask

- Would a reader recognize this as our brand without seeing the logo?
- Does the content "sound like us"?
- Are any traits contradicted by the messaging?

---

## 2. Tone of Voice Check

### Formality Level

- [ ] Matches intended formality (casual / professional / technical)
- [ ] Consistent throughout the piece
- [ ] Appropriate for the channel and audience

### Emotional Tone

- [ ] Reflects brand mood (confident / friendly / authoritative / playful)
- [ ] Avoids tones we don't use (aggressive / condescending / overly salesy)
- [ ] Creates the intended emotional response

### Energy Level

- [ ] Matches brand energy (calm / dynamic / enthusiastic)
- [ ] Sentence structure supports the energy
- [ ] Punctuation choices are appropriate

---

## 3. Language & Vocabulary

### Preferred Terms

- [ ] Uses approved terminology from brand dictionary
- [ ] Avoids banned words/phrases from negative directory
- [ ] Industry jargon used appropriately (or avoided per guidelines)

### Sentence Structure

- [ ] Average sentence length matches brand style
- [ ] Mix of simple and complex sentences is appropriate
- [ ] Active voice used consistently (unless passive is intentional)

### Word Choice

- [ ] Vocabulary level matches audience
- [ ] Power words align with brand personality
- [ ] No clichés or overused expressions

---

## 4. Audience Alignment

### Target Persona Match

- [ ] Language resonates with target audience
- [ ] Addresses their pain points/motivations
- [ ] Uses references they would understand
- [ ] Appropriate reading level

### Inclusivity

- [ ] Gender-neutral language where appropriate
- [ ] Culturally sensitive
- [ ] Accessible to diverse audiences

---

## 5. Message Consistency

### Brand Promises

- [ ] Content supports brand promises
- [ ] No conflicting messages
- [ ] Value proposition is clear

### Call-to-Action

- [ ] CTA language matches brand voice
- [ ] Action verbs are on-brand
- [ ] Urgency level is appropriate

---

## 6. Format & Presentation

### Visual Voice Elements

- [ ] Headline style is consistent
- [ ] Bullet point format matches guidelines
- [ ] Capitalization follows brand rules

### Structure

- [ ] Opening hook is on-brand
- [ ] Transitions feel natural
- [ ] Closing matches brand style

---

## Scoring Matrix

Rate each category 1-5 (1 = Poor, 5 = Excellent)

| Category | Score | Notes |
|----------|-------|-------|
| Personality Alignment | /5 | |
| Tone of Voice | /5 | |
| Language & Vocabulary | /5 | |
| Audience Alignment | /5 | |
| Message Consistency | /5 | |
| Format & Presentation | /5 | |
| **Total** | /30 | |

### Score Interpretation

- **25-30:** Publish ready
- **20-24:** Minor revisions needed
- **15-19:** Significant revisions required
- **Below 15:** Content needs rewrite

---

## Quick Checklist (For Fast Reviews)

When time is limited, verify at minimum:

- [ ] Sounds like our brand
- [ ] Right tone for the audience
- [ ] No banned words/phrases
- [ ] Supports our brand promises
- [ ] Would pass the "logo removal" test

---

## Red Flags (Immediate Rejection)

Stop review if content contains:

- Contradicts brand values
- Uses competitor terminology
- Off-brand humor or references
- Inappropriate formality level
- Banned language patterns

---

## Review Sign-Off

| Reviewer | Date | Decision | Notes |
|----------|------|----------|-------|
| | | Approved / Revise / Reject | |

---

## Remember

Consistency builds trust. Every piece of content is an opportunity to reinforce who your brand is. When in doubt, ask: "Would our brand actually say this?"
`
  }
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const results = []

    for (const template of TEMPLATES) {
      const { error } = await supabaseAdmin.storage
        .from('knowledge_files')
        .upload(template.path, template.content, {
          contentType: 'text/plain',
          upsert: true
        })

      results.push({
        path: template.path,
        success: !error,
        error: error?.message
      })
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
