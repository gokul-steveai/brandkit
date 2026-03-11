-- Add token_purchase to the token_transaction_type enum
ALTER TYPE public.token_transaction_type ADD VALUE IF NOT EXISTS 'token_purchase';