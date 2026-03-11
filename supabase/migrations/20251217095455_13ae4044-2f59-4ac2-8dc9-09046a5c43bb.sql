-- Add curated template knowledge files for Claude Skill export
INSERT INTO library_knowledge_files (
  id, reference_name, display_name, description, file_type, 
  system_instruction_hint, is_library, storage_path
) VALUES 
(
  'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  'negative_governance_dictionary',
  'Negative Governance Dictionary',
  'A prioritized list of banned keywords, jargon, and anti-patterns that AI should never generate.',
  'curated_template',
  'Reference this document to avoid using banned language patterns.',
  true,
  'templates/negative-governance-dictionary.md'
),
(
  'd2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d',
  'bias_ethics_audit_framework',
  'Bias & Ethics Audit Framework',
  'A framework for testing AI against synthetic personas to ensure it does not amplify biases or hallucinate harmful stereotypes.',
  'curated_template',
  'Use this framework for scheduled ethics audits of AI outputs.',
  true,
  'templates/bias-ethics-audit-framework.md'
);