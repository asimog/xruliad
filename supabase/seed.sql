-- Supabase Seed Data
-- HyperMyths seed: default provider configs and initial product capabilities.

insert into provider_configs (provider_name, provider_type, config, enabled) values
  ('openrouter', 'inference', '{"base_url": "https://openrouter.ai/api/v1", "allow_free": true}', true),
  ('qvac', 'local_inference', '{"base_url": "http://localhost:11434/v1", "requires_pairing": true, "local_only": true}', false),
  ('platform_paysh', 'payment', '{"plane": "platform", "currency": "USDC", "receipts_public": true}', false),
  ('user_local_paysh', 'local_payment', '{"plane": "user_local", "currency": "USDC", "local_only": true}', false)
on conflict (provider_name) do nothing;

insert into product_capabilities (product_id, product_name, domain, runtime_support, schema_version) values
  ('hypermyths', 'HyperMyths Terminal', 'hypermyths.com', array['web', 'local', 'hybrid'], 'product-api.v1'),
  ('hashmyth', 'HashMyth', 'hashmyth.com', array['web', 'hybrid'], 'product-api.v1'),
  ('polymyths', 'Polymyths', 'polymyths.com', array['web', 'hybrid'], 'product-api.v1'),
  ('cancerhawk', 'CancerHawk', 'cancerhawk.org', array['web'], 'product-api.v1'),
  ('hyperkaon', 'HyperKaon', 'hyperkaon.com', array['web', 'hybrid'], 'product-api.v1'),
  ('hypertian', 'Hypertian', 'hypertian.com', array['web', 'hybrid'], 'product-api.v1')
on conflict (product_id) do nothing;
