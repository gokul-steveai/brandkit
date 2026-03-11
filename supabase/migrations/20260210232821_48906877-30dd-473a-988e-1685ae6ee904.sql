ALTER TABLE partner_integrations 
ADD CONSTRAINT unique_brand_kit_partner 
UNIQUE (brand_kit_id, partner_name);