import type { MessagingFramework } from './types';

/**
 * Complete library of messaging frameworks from the LLM Messaging Frameworks Specification.
 * Each framework includes:
 * - Required and optional references (what data is needed)
 * - Variable inventory (people, things, contexts)
 * - Execution steps (how to use the framework)
 * - Failure modes (what to avoid)
 * - Metadata for selection (emotional load, ethical risk, etc.)
 */
export const MESSAGING_FRAMEWORKS: MessagingFramework[] = [
  {
    id: 'pastor',
    name: 'PASTOR',
    description: 'Problem-Amplify-Story-Testimony-Offer-Response. A comprehensive persuasion framework that guides prospects from pain to solution through storytelling and social proof.',
    userGoals: ['persuade', 'convert'],
    contentFormats: ['landing_page', 'sales_page', 'email'],
    audienceAwarenessLevels: ['problem-aware', 'solution-aware'],
    emotionalLoad: 'medium',
    ethicalRisk: 'medium',
    requiredReferences: [
      { name: 'customer_persona', type: 'person', description: 'Primary buyer or user experiencing the pain' },
      { name: 'product', type: 'thing', description: 'Product or service positioned as solution' }
    ],
    optionalReferences: [
      { name: 'testimonials', type: 'proof', description: 'Quotes or results reinforcing credibility' },
      { name: 'offer', type: 'thing', description: 'Pricing, trial, or call-to-action details' }
    ],
    variableInventory: {
      people: ['customer_persona', 'testimonial_subject'],
      things: ['product', 'offer'],
      contexts: ['problem_state', 'desired_state']
    },
    executionSteps: [
      { step: 1, label: 'Problem', instruction: 'Describe the core pain in the persona\'s own language' },
      { step: 2, label: 'Amplify', instruction: 'Intensify consequences without exaggeration' },
      { step: 3, label: 'Story', instruction: 'Tell a relatable transformation story' },
      { step: 4, label: 'Testimony', instruction: 'Introduce proof or social validation' },
      { step: 5, label: 'Offer', instruction: 'Present the product as the solution' },
      { step: 6, label: 'Response', instruction: 'Ask for a clear next action' }
    ],
    failureModes: [
      'Executing without a defined persona',
      'Over-agitating and reducing trust'
    ],
    outputLengthAffinity: ['long-form', 'landing_page', 'sales_letter'],
    brandVoiceSensitivity: 'Intensifies emotion - requires clear brand voice constraints',
    exampleContext: 'Landing page for SaaS founders',
    exampleSampleOutput: 'You didn\'t start your company to sound generic. But somewhere between ChatGPT drafts and rushed launches, your voice started to blur...'
  },
  {
    id: 'before_after_bridge',
    name: 'Before–After–Bridge',
    description: 'A simple transformation framework that contrasts the current painful state with a desirable future, then explains how to bridge the gap.',
    userGoals: ['educate', 'introduce', 'reframe'],
    contentFormats: ['blog', 'email', 'case_study'],
    audienceAwarenessLevels: ['unaware', 'problem-aware'],
    emotionalLoad: 'medium',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'customer_persona', type: 'person', description: 'Audience experiencing the before state' },
      { name: 'product', type: 'thing', description: 'Mechanism enabling transformation' }
    ],
    optionalReferences: [
      { name: 'metrics', type: 'proof', description: 'Evidence of improvement' }
    ],
    variableInventory: {
      people: ['customer_persona'],
      things: ['product'],
      contexts: ['before_state', 'after_state']
    },
    executionSteps: [
      { step: 1, label: 'Before', instruction: 'Describe the current painful reality' },
      { step: 2, label: 'After', instruction: 'Paint the improved future state' },
      { step: 3, label: 'Bridge', instruction: 'Explain how the product enables the change' }
    ],
    failureModes: [
      'Skipping emotional contrast',
      'Making the bridge feel complex'
    ],
    outputLengthAffinity: ['short-form', 'mid-form', 'email', 'blog_section'],
    brandVoiceSensitivity: 'Moderate - adapts well to different tones',
    exampleContext: 'Educational blog post',
    exampleSampleOutput: 'Before automation, brand reviews took days. After, they took minutes...'
  },
  {
    id: 'aida',
    name: 'AIDA',
    description: 'Attention-Interest-Desire-Action. A classic marketing framework that guides prospects through awareness to action.',
    userGoals: ['attract', 'convert', 'prompt_action'],
    contentFormats: ['ad', 'email', 'landing_page'],
    audienceAwarenessLevels: ['unaware', 'problem-aware'],
    emotionalLoad: 'medium',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'customer_persona', type: 'person', description: 'Target audience whose attention must be captured' },
      { name: 'product', type: 'thing', description: 'Product or offer being promoted' }
    ],
    optionalReferences: [
      { name: 'offer', type: 'thing', description: 'Incentive or CTA' }
    ],
    variableInventory: {
      people: ['customer_persona'],
      things: ['product', 'offer'],
      contexts: ['attention_context']
    },
    executionSteps: [
      { step: 1, label: 'Attention', instruction: 'Capture with a hook or bold statement' },
      { step: 2, label: 'Interest', instruction: 'Build curiosity and relevance' },
      { step: 3, label: 'Desire', instruction: 'Translate benefits into wants' },
      { step: 4, label: 'Action', instruction: 'Ask for a single clear action' }
    ],
    failureModes: [
      'Asking for action too early',
      'Weak attention hook'
    ],
    outputLengthAffinity: ['short-form', 'mid-form', 'ads', 'emails'],
    brandVoiceSensitivity: 'Low - highly adaptable framework',
    exampleContext: 'Promotional email',
    exampleSampleOutput: 'What if your brand never drifted again?'
  },
  {
    id: 'problem_agitate_solve',
    name: 'Problem–Agitate–Solve',
    description: 'A direct persuasion framework that identifies a problem, intensifies the emotional stakes, then presents the solution.',
    userGoals: ['persuade', 'convert'],
    contentFormats: ['sales_page', 'cold_email'],
    audienceAwarenessLevels: ['problem-aware'],
    emotionalLoad: 'high',
    ethicalRisk: 'medium',
    requiredReferences: [
      { name: 'customer_persona', type: 'person', description: 'Person experiencing the problem' },
      { name: 'problem', type: 'context', description: 'Core issue being addressed' },
      { name: 'product', type: 'thing', description: 'Solution' }
    ],
    optionalReferences: [
      { name: 'proof', type: 'proof', description: 'Evidence supporting solution' }
    ],
    variableInventory: {
      people: ['customer_persona'],
      things: ['product'],
      contexts: ['problem_state']
    },
    executionSteps: [
      { step: 1, label: 'Problem', instruction: 'State the issue clearly' },
      { step: 2, label: 'Agitate', instruction: 'Deepen emotional impact' },
      { step: 3, label: 'Solve', instruction: 'Present solution as relief' }
    ],
    failureModes: [
      'Excessive fear amplification',
      'Solution feels disconnected from problem'
    ],
    outputLengthAffinity: ['short-form', 'mid-form', 'cold_email'],
    brandVoiceSensitivity: 'High - can intensify brand tone dramatically',
    exampleContext: 'Cold outreach',
    exampleSampleOutput: 'Every new AI tool chips away at your brand…'
  },
  {
    id: 'star_story_solution',
    name: 'Star–Story–Solution',
    description: 'A narrative framework that introduces a relatable protagonist, tells their journey, and shows how the product enabled their success.',
    userGoals: ['inspire', 'build_trust'],
    contentFormats: ['case_study', 'blog'],
    audienceAwarenessLevels: ['solution-aware'],
    emotionalLoad: 'medium',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'protagonist', type: 'person', description: 'Hero of the story' },
      { name: 'challenge', type: 'context', description: 'Central struggle' },
      { name: 'product', type: 'thing', description: 'Enabling solution' }
    ],
    optionalReferences: [
      { name: 'outcome', type: 'proof', description: 'Result achieved' }
    ],
    variableInventory: {
      people: ['protagonist'],
      things: ['product'],
      contexts: ['journey']
    },
    executionSteps: [
      { step: 1, label: 'Star', instruction: 'Introduce relatable hero' },
      { step: 2, label: 'Story', instruction: 'Describe journey and struggle' },
      { step: 3, label: 'Solution', instruction: 'Show resolution via product' }
    ],
    failureModes: [
      'Making product the hero instead of the person',
      'Story lacks authentic struggle'
    ],
    outputLengthAffinity: ['mid-form', 'long-form', 'case_study'],
    brandVoiceSensitivity: 'Narrative-heavy - amplifies storytelling aspects of brand voice',
    exampleContext: 'Founder story',
    exampleSampleOutput: 'When Alex scaled from 3 to 30 people…'
  },
  {
    id: 'positive_negative',
    name: 'Positive–Negative',
    description: 'A balanced evaluation framework that presents strengths and limitations honestly.',
    userGoals: ['educate', 'build_trust'],
    contentFormats: ['blog', 'review'],
    audienceAwarenessLevels: ['solution-aware'],
    emotionalLoad: 'low',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'product', type: 'thing', description: 'Subject being evaluated' }
    ],
    optionalReferences: [
      { name: 'alternatives', type: 'thing', description: 'Comparison context' }
    ],
    variableInventory: {
      people: [],
      things: ['product'],
      contexts: ['pros_cons']
    },
    executionSteps: [
      { step: 1, label: 'Positive', instruction: 'Highlight strengths' },
      { step: 2, label: 'Negative', instruction: 'Address limitations honestly' }
    ],
    failureModes: [
      'Overweighting negatives',
      'Insincere positives'
    ],
    outputLengthAffinity: ['mid-form', 'blog', 'review'],
    brandVoiceSensitivity: 'Low - analytical tone',
    exampleContext: 'Product analysis',
    exampleSampleOutput: 'It excels at consistency, but requires setup discipline.'
  },
  {
    id: 'picture_promise_prove_push',
    name: 'Picture–Promise–Prove–Push',
    description: 'A persuasion framework that paints a vivid outcome, makes a promise, proves it with evidence, then pushes to action.',
    userGoals: ['persuade', 'reduce_risk'],
    contentFormats: ['landing_page', 'sales_page'],
    audienceAwarenessLevels: ['solution-aware', 'product-aware'],
    emotionalLoad: 'medium',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'customer_persona', type: 'person', description: 'Intended decision-maker' },
      { name: 'product', type: 'thing', description: 'Offering being evaluated' }
    ],
    optionalReferences: [
      { name: 'proof', type: 'proof', description: 'Testimonials or evidence' }
    ],
    variableInventory: {
      people: ['customer_persona'],
      things: ['product'],
      contexts: ['future_state']
    },
    executionSteps: [
      { step: 1, label: 'Picture', instruction: 'Paint vivid outcome' },
      { step: 2, label: 'Promise', instruction: 'State clear benefit' },
      { step: 3, label: 'Prove', instruction: 'Reduce doubt with evidence' },
      { step: 4, label: 'Push', instruction: 'Encourage action' }
    ],
    failureModes: [
      'Weak or absent proof',
      'Promise too vague'
    ],
    outputLengthAffinity: ['mid-form', 'long-form', 'landing_page'],
    brandVoiceSensitivity: 'Medium - visual/descriptive language emphasized',
    exampleContext: 'Product page',
    exampleSampleOutput: 'Imagine every asset shipping on-brand…'
  },
  {
    id: 'awareness_comprehension_conviction_action',
    name: 'Awareness–Comprehension–Conviction–Action',
    description: 'An educational framework that takes readers from unawareness through understanding to belief and action.',
    userGoals: ['educate', 'convert'],
    contentFormats: ['long_form_blog', 'webinar'],
    audienceAwarenessLevels: ['unaware', 'problem-aware'],
    emotionalLoad: 'low',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'customer_persona', type: 'person', description: 'Learner audience' },
      { name: 'product', type: 'thing', description: 'Solution' }
    ],
    optionalReferences: [
      { name: 'data', type: 'proof', description: 'Supporting facts' }
    ],
    variableInventory: {
      people: ['customer_persona'],
      things: ['product'],
      contexts: ['learning_journey']
    },
    executionSteps: [
      { step: 1, label: 'Awareness', instruction: 'Introduce problem' },
      { step: 2, label: 'Comprehension', instruction: 'Explain mechanics' },
      { step: 3, label: 'Conviction', instruction: 'Build belief' },
      { step: 4, label: 'Action', instruction: 'Suggest next step' }
    ],
    failureModes: [
      'Skipping comprehension',
      'Moving to conviction without evidence'
    ],
    outputLengthAffinity: ['long-form', 'educational', 'webinar'],
    brandVoiceSensitivity: 'Low - instructional tone dominates',
    exampleContext: 'Educational article',
    exampleSampleOutput: 'Most teams don\'t realize brand drift is cumulative…'
  },
  {
    id: 'five_basic_objections',
    name: 'Five Basic Objections',
    description: 'A framework for systematically addressing the five universal buying objections: time, money, trust, belief, and need.',
    userGoals: ['overcome_resistance'],
    contentFormats: ['sales_page', 'pricing_page'],
    audienceAwarenessLevels: ['product-aware'],
    emotionalLoad: 'medium',
    ethicalRisk: 'medium',
    requiredReferences: [
      { name: 'product', type: 'thing', description: 'Offer being evaluated' }
    ],
    optionalReferences: [
      { name: 'proof', type: 'proof', description: 'Reassurance evidence' }
    ],
    variableInventory: {
      people: [],
      things: ['product'],
      contexts: ['objection_space']
    },
    executionSteps: [
      { step: 1, label: 'Time', instruction: 'Address time concern' },
      { step: 2, label: 'Money', instruction: 'Address cost concern' },
      { step: 3, label: 'Trust', instruction: 'Address credibility' },
      { step: 4, label: 'Belief', instruction: 'Address efficacy' },
      { step: 5, label: 'Need', instruction: 'Address relevance' }
    ],
    failureModes: [
      'Defensive tone',
      'Ignoring legitimate concerns'
    ],
    outputLengthAffinity: ['mid-form', 'faq', 'pricing_page'],
    brandVoiceSensitivity: 'Medium - requires confident but not aggressive tone',
    exampleContext: 'Pricing explanation',
    exampleSampleOutput: 'You might think this takes too long…'
  },
  {
    id: 'four_cs',
    name: 'Four C\'s',
    description: 'A quality framework ensuring messages are Clear, Concise, Compelling, and Credible.',
    userGoals: ['clarify'],
    contentFormats: ['any'],
    audienceAwarenessLevels: ['any'],
    emotionalLoad: 'low',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'message', type: 'thing', description: 'Core idea' }
    ],
    optionalReferences: [],
    variableInventory: {
      people: [],
      things: ['message'],
      contexts: []
    },
    executionSteps: [
      { step: 1, label: 'Clear', instruction: 'Remove ambiguity' },
      { step: 2, label: 'Concise', instruction: 'Reduce length' },
      { step: 3, label: 'Compelling', instruction: 'Add interest' },
      { step: 4, label: 'Credible', instruction: 'Add trust' }
    ],
    failureModes: [
      'Over-editing personality',
      'Removing too much context'
    ],
    outputLengthAffinity: ['any'],
    brandVoiceSensitivity: 'Low - a refinement framework',
    exampleContext: 'Homepage copy',
    exampleSampleOutput: 'One source of truth for your brand.'
  },
  {
    id: 'consistent_contrasting',
    name: 'Consistent–Contrasting',
    description: 'A rhetorical framework that anchors on a theme then introduces deliberate contrast for engagement.',
    userGoals: ['engage'],
    contentFormats: ['long_form'],
    audienceAwarenessLevels: ['any'],
    emotionalLoad: 'low',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'theme', type: 'thing', description: 'Core idea' }
    ],
    optionalReferences: [],
    variableInventory: {
      people: [],
      things: ['theme'],
      contexts: []
    },
    executionSteps: [
      { step: 1, label: 'Consistent', instruction: 'Anchor theme' },
      { step: 2, label: 'Contrasting', instruction: 'Introduce contrast' }
    ],
    failureModes: [
      'Excessive contrast',
      'Weak anchor theme'
    ],
    outputLengthAffinity: ['mid-form', 'long-form', 'essay'],
    brandVoiceSensitivity: 'Low - structural framework',
    exampleContext: 'Essay',
    exampleSampleOutput: 'Consistency matters—until it doesn\'t.'
  },
  {
    id: 'strong_weak',
    name: 'Strong–Weak',
    description: 'A balanced framework that leads with strengths then honestly addresses limitations.',
    userGoals: ['build_trust'],
    contentFormats: ['comparison', 'sales'],
    audienceAwarenessLevels: ['product-aware'],
    emotionalLoad: 'low',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'product', type: 'thing', description: 'Evaluated offering' }
    ],
    optionalReferences: [],
    variableInventory: {
      people: [],
      things: ['product'],
      contexts: []
    },
    executionSteps: [
      { step: 1, label: 'Strong', instruction: 'Highlight strengths' },
      { step: 2, label: 'Weak', instruction: 'Admit limits' }
    ],
    failureModes: [
      'Undermining confidence',
      'Weakness overshadows strength'
    ],
    outputLengthAffinity: ['short-form', 'mid-form', 'comparison'],
    brandVoiceSensitivity: 'Low - honest assessment tone',
    exampleContext: 'Comparison page',
    exampleSampleOutput: 'It\'s powerful, but not instant.'
  },
  {
    id: 'emotion_logic',
    name: 'Emotion–Logic',
    description: 'A persuasion framework that connects emotionally first, then provides rational justification.',
    userGoals: ['persuade'],
    contentFormats: ['essay', 'pitch'],
    audienceAwarenessLevels: ['problem-aware'],
    emotionalLoad: 'medium',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'customer_persona', type: 'person', description: 'Decision-maker' },
      { name: 'product', type: 'thing', description: 'Solution' }
    ],
    optionalReferences: [],
    variableInventory: {
      people: ['customer_persona'],
      things: ['product'],
      contexts: []
    },
    executionSteps: [
      { step: 1, label: 'Emotion', instruction: 'Connect emotionally' },
      { step: 2, label: 'Logic', instruction: 'Justify rationally' }
    ],
    failureModes: [
      'Over-indexing emotion',
      'Logic without emotional foundation'
    ],
    outputLengthAffinity: ['mid-form', 'pitch', 'essay'],
    brandVoiceSensitivity: 'Medium - emotion amplifies brand voice',
    exampleContext: 'Founder pitch',
    exampleSampleOutput: 'It\'s frustrating—here\'s why it makes sense.'
  },
  {
    id: 'personal_universal',
    name: 'Personal–Universal',
    description: 'A thought leadership framework that shares personal experience then extracts universal truths.',
    userGoals: ['inspire'],
    contentFormats: ['thought_leadership'],
    audienceAwarenessLevels: ['any'],
    emotionalLoad: 'medium',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'narrator', type: 'person', description: 'Storyteller' }
    ],
    optionalReferences: [],
    variableInventory: {
      people: ['narrator'],
      things: [],
      contexts: []
    },
    executionSteps: [
      { step: 1, label: 'Personal', instruction: 'Share lived experience' },
      { step: 2, label: 'Universal', instruction: 'Extract shared truth' }
    ],
    failureModes: [
      'Self-indulgence',
      'Universal truth too generic'
    ],
    outputLengthAffinity: ['mid-form', 'long-form', 'thought_leadership'],
    brandVoiceSensitivity: 'High - requires authentic personal voice',
    exampleContext: 'Founder essay',
    exampleSampleOutput: 'I learned this the hard way…'
  },
  {
    id: 'urgency_patience',
    name: 'Urgency–Patience',
    description: 'A motivation framework that balances immediate action with long-term value.',
    userGoals: ['motivate_action'],
    contentFormats: ['campaign'],
    audienceAwarenessLevels: ['solution-aware'],
    emotionalLoad: 'medium',
    ethicalRisk: 'medium',
    requiredReferences: [
      { name: 'action', type: 'thing', description: 'Desired action' }
    ],
    optionalReferences: [],
    variableInventory: {
      people: [],
      things: ['action'],
      contexts: []
    },
    executionSteps: [
      { step: 1, label: 'Urgency', instruction: 'Emphasize now' },
      { step: 2, label: 'Patience', instruction: 'Emphasize long-term value' }
    ],
    failureModes: [
      'False urgency',
      'Contradiction between urgency and patience'
    ],
    outputLengthAffinity: ['short-form', 'campaign', 'email'],
    brandVoiceSensitivity: 'Medium - urgency can conflict with brand tone',
    exampleContext: 'Launch email',
    exampleSampleOutput: 'Start today—benefit for years.'
  },
  {
    id: 'expectation_surprise',
    name: 'Expectation–Surprise',
    description: 'A differentiation framework that sets up conventional expectations then subverts them.',
    userGoals: ['differentiate'],
    contentFormats: ['blog', 'ad'],
    audienceAwarenessLevels: ['any'],
    emotionalLoad: 'low',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'norm', type: 'context', description: 'Expected pattern' }
    ],
    optionalReferences: [],
    variableInventory: {
      people: [],
      things: [],
      contexts: ['norm']
    },
    executionSteps: [
      { step: 1, label: 'Expectation', instruction: 'State assumption' },
      { step: 2, label: 'Surprise', instruction: 'Subvert it' }
    ],
    failureModes: [
      'Forced surprise',
      'Expectation not widely held'
    ],
    outputLengthAffinity: ['short-form', 'mid-form', 'hooks'],
    brandVoiceSensitivity: 'Medium - surprise element needs brand alignment',
    exampleContext: 'Thought piece',
    exampleSampleOutput: 'You\'d think speed matters most—but it doesn\'t.'
  },
  {
    id: 'exclusive_inclusive',
    name: 'Exclusive–Inclusive',
    description: 'A premium positioning framework that signals selectivity while inviting participation.',
    userGoals: ['position_premium'],
    contentFormats: ['brand_page'],
    audienceAwarenessLevels: ['product-aware'],
    emotionalLoad: 'low',
    ethicalRisk: 'medium',
    requiredReferences: [
      { name: 'product', type: 'thing', description: 'Premium offering' }
    ],
    optionalReferences: [],
    variableInventory: {
      people: [],
      things: ['product'],
      contexts: []
    },
    executionSteps: [
      { step: 1, label: 'Exclusive', instruction: 'Signal selectivity' },
      { step: 2, label: 'Inclusive', instruction: 'Invite participation' }
    ],
    failureModes: [
      'Appearing elitist',
      'Mixed messaging'
    ],
    outputLengthAffinity: ['short-form', 'mid-form', 'brand_page'],
    brandVoiceSensitivity: 'High - must align with brand premium positioning',
    exampleContext: 'Membership page',
    exampleSampleOutput: 'Not for everyone—but maybe for you.'
  },
  {
    id: 'past_present_future',
    name: 'Past–Present–Future',
    description: 'A vision framework that acknowledges history, describes the current state, then paints the future.',
    userGoals: ['vision'],
    contentFormats: ['roadmap', 'essay'],
    audienceAwarenessLevels: ['any'],
    emotionalLoad: 'low',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'context', type: 'context', description: 'Timeline' }
    ],
    optionalReferences: [],
    variableInventory: {
      people: [],
      things: [],
      contexts: ['timeline']
    },
    executionSteps: [
      { step: 1, label: 'Past', instruction: 'Acknowledge history' },
      { step: 2, label: 'Present', instruction: 'Describe now' },
      { step: 3, label: 'Future', instruction: 'Paint vision' }
    ],
    failureModes: [
      'Dwelling on past',
      'Vague future vision'
    ],
    outputLengthAffinity: ['mid-form', 'long-form', 'company_update'],
    brandVoiceSensitivity: 'Low - visionary tone',
    exampleContext: 'Company update',
    exampleSampleOutput: 'Where we\'ve been, where we are, where we\'re going.'
  },
  {
    id: 'friend_expert',
    name: 'Friend–Expert',
    description: 'An advisory framework that combines empathy with expertise.',
    userGoals: ['advise'],
    contentFormats: ['guide'],
    audienceAwarenessLevels: ['any'],
    emotionalLoad: 'low',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'advisor', type: 'person', description: 'Voice' }
    ],
    optionalReferences: [],
    variableInventory: {
      people: ['advisor'],
      things: [],
      contexts: []
    },
    executionSteps: [
      { step: 1, label: 'Friend', instruction: 'Show empathy' },
      { step: 2, label: 'Expert', instruction: 'Provide guidance' }
    ],
    failureModes: [
      'Talking down',
      'Expertise without empathy'
    ],
    outputLengthAffinity: ['mid-form', 'guide', 'how-to'],
    brandVoiceSensitivity: 'High - requires warm, knowledgeable tone',
    exampleContext: 'How-to article',
    exampleSampleOutput: 'I\'ve been there—here\'s what works.'
  },
  {
    id: 'pain_agitate_relief',
    name: 'Pain–Agitate–Relief',
    description: 'An intensified persuasion framework that identifies pain, heightens it, then provides relief.',
    userGoals: ['convert'],
    contentFormats: ['sales'],
    audienceAwarenessLevels: ['problem-aware'],
    emotionalLoad: 'high',
    ethicalRisk: 'medium',
    requiredReferences: [
      { name: 'pain', type: 'context', description: 'Core suffering' },
      { name: 'product', type: 'thing', description: 'Relief mechanism' }
    ],
    optionalReferences: [],
    variableInventory: {
      people: [],
      things: ['product'],
      contexts: ['pain_state']
    },
    executionSteps: [
      { step: 1, label: 'Pain', instruction: 'Identify pain' },
      { step: 2, label: 'Agitate', instruction: 'Intensify' },
      { step: 3, label: 'Relief', instruction: 'Resolve' }
    ],
    failureModes: [
      'Excessive pressure',
      'Manipulative agitation'
    ],
    outputLengthAffinity: ['short-form', 'mid-form', 'sales'],
    brandVoiceSensitivity: 'High - can conflict with gentle brand voices',
    exampleContext: 'Landing page',
    exampleSampleOutput: 'It hurts—until it doesn\'t.'
  },
  {
    id: 'solution_savings_social_proof',
    name: 'Solution–Savings–Social Proof',
    description: 'A purchase justification framework that presents solution, quantifies value, and reinforces with proof.',
    userGoals: ['justify_purchase'],
    contentFormats: ['pricing'],
    audienceAwarenessLevels: ['product-aware'],
    emotionalLoad: 'low',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'product', type: 'thing', description: 'Solution' }
    ],
    optionalReferences: [
      { name: 'proof', type: 'proof', description: 'Testimonials' }
    ],
    variableInventory: {
      people: [],
      things: ['product'],
      contexts: []
    },
    executionSteps: [
      { step: 1, label: 'Solution', instruction: 'State value' },
      { step: 2, label: 'Savings', instruction: 'Quantify benefit' },
      { step: 3, label: 'Proof', instruction: 'Reinforce trust' }
    ],
    failureModes: [
      'Unsubstantiated claims',
      'Vague savings'
    ],
    outputLengthAffinity: ['short-form', 'mid-form', 'pricing_page'],
    brandVoiceSensitivity: 'Low - factual/ROI focused',
    exampleContext: 'ROI page',
    exampleSampleOutput: 'Save hours—here\'s proof.'
  },
  {
    id: 'six_ws',
    name: 'Six W\'s',
    description: 'A comprehensive clarification framework covering Who, What, When, Where, Why, and How.',
    userGoals: ['clarify'],
    contentFormats: ['documentation'],
    audienceAwarenessLevels: ['any'],
    emotionalLoad: 'low',
    ethicalRisk: 'low',
    requiredReferences: [
      { name: 'subject', type: 'thing', description: 'Topic explained' }
    ],
    optionalReferences: [],
    variableInventory: {
      people: [],
      things: ['subject'],
      contexts: []
    },
    executionSteps: [
      { step: 1, label: 'Who', instruction: 'Identify audience' },
      { step: 2, label: 'What', instruction: 'Define subject' },
      { step: 3, label: 'When', instruction: 'Timing' },
      { step: 4, label: 'Where', instruction: 'Location or context' },
      { step: 5, label: 'Why', instruction: 'Rationale' },
      { step: 6, label: 'How', instruction: 'Mechanism' }
    ],
    failureModes: [
      'Incomplete answers',
      'Too verbose for simple topics'
    ],
    outputLengthAffinity: ['mid-form', 'long-form', 'documentation'],
    brandVoiceSensitivity: 'Low - informational tone',
    exampleContext: 'Knowledge base',
    exampleSampleOutput: 'Who uses this? What does it do? When should you apply it?'
  }
];

/**
 * Framework selector matrix - maps conditions to recommended frameworks
 */
export const FRAMEWORK_SELECTOR_MATRIX = [
  {
    conditions: { userGoal: 'convert', awareness: 'problem-aware', format: 'sales_page' },
    recommendedFrameworks: ['pastor', 'problem_agitate_solve', 'pain_agitate_relief']
  },
  {
    conditions: { userGoal: 'educate', awareness: 'unaware', format: 'blog' },
    recommendedFrameworks: ['before_after_bridge', 'awareness_comprehension_conviction_action']
  },
  {
    conditions: { userGoal: 'justify_purchase', awareness: 'product-aware', format: 'pricing_page' },
    recommendedFrameworks: ['solution_savings_social_proof', 'five_basic_objections']
  },
  {
    conditions: { userGoal: 'inspire', awareness: 'any', format: 'thought_leadership' },
    recommendedFrameworks: ['personal_universal', 'past_present_future']
  }
];

/**
 * ICP to framework affinity mapping
 */
export const ICP_FRAMEWORK_AFFINITY = {
  ai_first_founders: ['pastor', 'before_after_bridge', 'past_present_future', 'solution_savings_social_proof'],
  marketing_professionals: ['awareness_comprehension_conviction_action', 'five_basic_objections', 'four_cs', 'consistent_contrasting'],
  content_creators: ['friend_expert', 'personal_universal', 'positive_negative', 'six_ws']
};

/**
 * Get a framework by ID
 */
export function getFrameworkById(id: string): MessagingFramework | undefined {
  return MESSAGING_FRAMEWORKS.find(f => f.id === id);
}

/**
 * Get frameworks by IDs
 */
export function getFrameworksByIds(ids: string[]): MessagingFramework[] {
  return ids.map(id => getFrameworkById(id)).filter((f): f is MessagingFramework => f !== undefined);
}

/**
 * Get frameworks filtered by emotional load
 */
export function getFrameworksByEmotionalLoad(load: 'low' | 'medium' | 'high'): MessagingFramework[] {
  return MESSAGING_FRAMEWORKS.filter(f => f.emotionalLoad === load);
}

/**
 * Get frameworks filtered by ethical risk
 */
export function getFrameworksByEthicalRisk(risk: 'low' | 'medium' | 'high'): MessagingFramework[] {
  return MESSAGING_FRAMEWORKS.filter(f => f.ethicalRisk === risk);
}

/**
 * Get frameworks suitable for a content format
 */
export function getFrameworksForContentFormat(format: string): MessagingFramework[] {
  return MESSAGING_FRAMEWORKS.filter(f => 
    f.contentFormats.includes(format) || f.contentFormats.includes('any')
  );
}
