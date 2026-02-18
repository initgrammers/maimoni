DO $$ 
DECLARE
    alim_id UUID;
    trans_id UUID;
    viv_id UUID;
    salud_id UUID;
    ent_id UUID;
    com_id UUID;
    edu_id UUID;
    via_id UUID;
    ot_id UUID;
    ing_id UUID;
BEGIN
    -- Limpiar categorías actuales
    DELETE FROM "categories";

    -- Alimentación
    INSERT INTO "categories" ("name", "emoji", "type") VALUES ('Alimentación', '🍔', 'expense') RETURNING id INTO alim_id;
    INSERT INTO "categories" ("name", "emoji", "type", "parent_id") VALUES 
    ('Supermercados', '🛒', 'expense', alim_id),
    ('Restaurantes', '🍽️', 'expense', alim_id),
    ('Cafeterías/Snacks', '☕', 'expense', alim_id),
    ('Delivery', '🛵', 'expense', alim_id),
    ('Comida rápida', '🍟', 'expense', alim_id),
    ('Bebidas/Alcohol', '🍺', 'expense', alim_id);

    -- Transporte
    INSERT INTO "categories" ("name", "emoji", "type") VALUES ('Transporte', '🚗', 'expense') RETURNING id INTO trans_id;
    INSERT INTO "categories" ("name", "emoji", "type", "parent_id") VALUES 
    ('Gasolina', '⛽', 'expense', trans_id),
    ('Mantenimiento Vehículo', '🔧', 'expense', trans_id),
    ('Uber/Didi', '🚕', 'expense', trans_id),
    ('Transporte público', '🚌', 'expense', trans_id),
    ('Peajes', '🛣️', 'expense', trans_id),
    ('Estacionamiento', '🅿️', 'expense', trans_id);

    -- Vivienda
    INSERT INTO "categories" ("name", "emoji", "type") VALUES ('Vivienda', '🏠', 'expense') RETURNING id INTO viv_id;
    INSERT INTO "categories" ("name", "emoji", "type", "parent_id") VALUES 
    ('Alquiler/Hipoteca', '🏡', 'expense', viv_id),
    ('Luz', '💡', 'expense', viv_id),
    ('Agua', '🚿', 'expense', viv_id),
    ('Gas', '🔥', 'expense', viv_id),
    ('Internet/Telefonía', '🌐', 'expense', viv_id),
    ('Seguridad/Admin', '🛡️', 'expense', viv_id),
    ('Muebles/Jardín', '🪑', 'expense', viv_id);

    -- Salud y Bienestar
    INSERT INTO "categories" ("name", "emoji", "type") VALUES ('Salud y Bienestar', '🏥', 'expense') RETURNING id INTO salud_id;
    INSERT INTO "categories" ("name", "emoji", "type", "parent_id") VALUES 
    ('Farmacia', '💊', 'expense', salud_id),
    ('Consultas médicas', '🩺', 'expense', salud_id),
    ('Dentista', '🦷', 'expense', salud_id),
    ('Gim./Deportes', '🏋️', 'expense', salud_id),
    ('Cuidado personal', '✂️', 'expense', salud_id),
    ('Seguro salud', '❤️', 'expense', salud_id);

    -- Entretenimiento
    INSERT INTO "categories" ("name", "emoji", "type") VALUES ('Entretenimiento', '🎭', 'expense') RETURNING id INTO ent_id;
    INSERT INTO "categories" ("name", "emoji", "type", "parent_id") VALUES 
    ('Cine/Eventos', '🎟️', 'expense', ent_id),
    ('Streaming', '📺', 'expense', ent_id),
    ('Bares/Discotecas', '🍹', 'expense', ent_id),
    ('Hobbies/Juegos', '🎮', 'expense', ent_id),
    ('Suscripciones', '💳', 'expense', ent_id);

    -- Compras
    INSERT INTO "categories" ("name", "emoji", "type") VALUES ('Compras', '👕', 'expense') RETURNING id INTO com_id;
    INSERT INTO "categories" ("name", "emoji", "type", "parent_id") VALUES 
    ('Ropa/Calzado', '👕', 'expense', com_id),
    ('Electrónica', '📱', 'expense', com_id),
    ('Regalos', '🎁', 'expense', com_id),
    ('Mascotas', '🐶', 'expense', com_id);

    -- Educación
    INSERT INTO "categories" ("name", "emoji", "type") VALUES ('Educación', '📚', 'expense') RETURNING id INTO edu_id;
    INSERT INTO "categories" ("name", "emoji", "type", "parent_id") VALUES 
    ('Cursos', '📚', 'expense', edu_id),
    ('Libros', '📖', 'expense', edu_id);

    -- Viajes
    INSERT INTO "categories" ("name", "emoji", "type") VALUES ('Viajes', '✈️', 'expense') RETURNING id INTO via_id;

    -- Otros
    INSERT INTO "categories" ("name", "emoji", "type") VALUES ('Otros', '🧾', 'expense') RETURNING id INTO ot_id;
    INSERT INTO "categories" ("name", "emoji", "type", "parent_id") VALUES 
    ('Impuestos', '🧾', 'expense', ot_id),
    ('Otros', '📦', 'expense', ot_id);

    -- Ingresos
    INSERT INTO "categories" ("name", "emoji", "type") VALUES ('Ingresos', '💼', 'income') RETURNING id INTO ing_id;
    INSERT INTO "categories" ("name", "emoji", "type", "parent_id") VALUES 
    ('Sueldo', '💼', 'income', ing_id),
    ('Transferencias', '🔁', 'income', ing_id),
    ('Reembolsos', '💸', 'income', ing_id),
    ('Intereses', '📈', 'income', ing_id),
    ('Ventas', '🛒', 'income', ing_id);

END $$;
