-- ============================================================
-- KitchenPulse — Multi-Tenant Organizations & Client Isolation Schema
-- Migration 03: organizations table, organization_id foreign keys, indexes
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Organizations Table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(255) NOT NULL,
    slug           VARCHAR(100) NOT NULL UNIQUE,
    code           VARCHAR(50) NOT NULL UNIQUE,
    address        TEXT,
    phone          VARCHAR(50),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations (slug);
CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations (code);

-- ── 2. Insert Default Demo Organizations ────────────────────
INSERT INTO organizations (id, name, slug, code, address, phone)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'The Grand Palace Hotel', 'grand-palace', 'HOTEL-GP-101', '742 Grand Avenue, Downtown Metro', '+1 (555) 234-5678'),
    ('22222222-2222-2222-2222-222222222222', 'Bistro Bella Napoli', 'bella-napoli', 'BISTRO-BN-202', '12 Via Roma, Waterfront District', '+1 (555) 876-5432')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, slug = EXCLUDED.slug, code = EXCLUDED.code;

-- ── 3. Add organization_id to users ─────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE users SET organization_id = '11111111-1111-1111-1111-111111111111' WHERE organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_org ON users (organization_id);

-- ── 4. Add organization_id to ingredients ───────────────────
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE ingredients SET organization_id = '11111111-1111-1111-1111-111111111111' WHERE organization_id IS NULL;
ALTER TABLE ingredients DROP CONSTRAINT IF EXISTS ingredients_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredients_org_name ON ingredients (organization_id, name);
CREATE INDEX IF NOT EXISTS idx_ingredients_org ON ingredients (organization_id);

-- ── 5. Add organization_id to recipes ───────────────────────
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE recipes SET organization_id = '11111111-1111-1111-1111-111111111111' WHERE organization_id IS NULL;
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS recipes_menu_item_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_org_menu_name ON recipes (organization_id, menu_item_name);
CREATE INDEX IF NOT EXISTS idx_recipes_org ON recipes (organization_id);

-- ── 6. Add organization_id to prep_logs ─────────────────────
ALTER TABLE prep_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE prep_logs SET organization_id = '11111111-1111-1111-1111-111111111111' WHERE organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_prep_logs_org ON prep_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_prep_logs_org_date ON prep_logs (organization_id, prep_date);

-- ── 7. Add organization_id to live_tickets ──────────────────
ALTER TABLE live_tickets ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE live_tickets SET organization_id = '11111111-1111-1111-1111-111111111111' WHERE organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_live_tickets_org ON live_tickets (organization_id);
CREATE INDEX IF NOT EXISTS idx_live_tickets_org_status ON live_tickets (organization_id, status);

-- ── 8. Add organization_id to supplier_orders ───────────────
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
UPDATE supplier_orders SET organization_id = '11111111-1111-1111-1111-111111111111' WHERE organization_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_orders_org ON supplier_orders (organization_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_org_status ON supplier_orders (organization_id, status);

-- ── 9. Recreate Materialized View with organization_id ───────
DROP MATERIALIZED VIEW IF EXISTS mv_food_cost_summary;

CREATE MATERIALIZED VIEW mv_food_cost_summary AS
SELECT
    r.id                                          AS recipe_id,
    r.organization_id                             AS organization_id,
    r.menu_item_name                              AS menu_item_name,
    r.name                                        AS recipe_name,
    r.price                                       AS price,
    r.sale_price                                  AS sale_price,
    COALESCE(SUM(pl.prepped_qty), 0)              AS total_prepped,
    COALESCE(SUM(pl.waste_qty), 0)                AS total_waste,
    -- Estimated ingredient cost per serving
    COALESCE(
        (SELECT SUM(ri.quantity_required * i.cost_per_unit)
         FROM   recipe_ingredients ri
         JOIN   ingredients i ON i.id = ri.ingredient_id
         WHERE  ri.recipe_id = r.id),
        0
    )                                             AS estimated_cost_per_serving,
    -- Total cost of ingredients prepped
    COALESCE(
        (SELECT SUM(ri.quantity_required * i.cost_per_unit)
         FROM   recipe_ingredients ri
         JOIN   ingredients i ON i.id = ri.ingredient_id
         WHERE  ri.recipe_id = r.id),
        0
    ) * COALESCE(SUM(pl.prepped_qty), 0)          AS total_cost,
    -- Food cost percentage (cost / sale_price × 100)
    CASE
        WHEN r.price > 0 THEN
            ROUND(
                COALESCE(
                    (SELECT SUM(ri.quantity_required * i.cost_per_unit)
                     FROM   recipe_ingredients ri
                     JOIN   ingredients i ON i.id = ri.ingredient_id
                     WHERE  ri.recipe_id = r.id),
                    0
                ) / r.price * 100,
                2
            )
        ELSE 0
    END                                           AS food_cost_pct,
    -- Waste percentage
    CASE
        WHEN COALESCE(SUM(pl.prepped_qty), 0) > 0 THEN
            ROUND(
                COALESCE(SUM(pl.waste_qty), 0)::NUMERIC
                / COALESCE(SUM(pl.prepped_qty), 0) * 100,
                2
            )
        ELSE 0
    END                                           AS waste_pct
FROM   recipes r
LEFT JOIN prep_logs pl ON pl.recipe_id = r.id
GROUP BY r.id, r.organization_id, r.menu_item_name, r.name, r.price, r.sale_price;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_food_cost_recipe ON mv_food_cost_summary (recipe_id);
CREATE INDEX IF NOT EXISTS idx_mv_food_cost_org ON mv_food_cost_summary (organization_id);
