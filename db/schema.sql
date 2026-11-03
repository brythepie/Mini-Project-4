CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(255) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    age INTEGER,
    occupation VARCHAR(255),
    city VARCHAR(255)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(255);

CREATE TABLE IF NOT EXISTS blogs (
    blog_id SERIAL PRIMARY KEY,
    creator_name VARCHAR(255) NOT NULL,
    creator_user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(32) NOT NULL DEFAULT 'Other',
    post_color VARCHAR(32) NOT NULL DEFAULT 'DarkGreen'
);

INSERT INTO users (user_id, password, name)
VALUES
    ('john', '$2b$12$YkFJhd./20fxlbmXA1ggNuH2iGr8SKgLpVbALrSv7Lj1.sz3LezUO', 'John Oates'),
    ('glenn', '$2b$12$uJjJLJ81nFZUga73FdvNcOWcJOq3LipjOJXSbvpoOdmDHTQDGCS/a', 'Glenn Campbell'),
    ('ark', '$2b$12$icdbuEOERUwTn.PJj0Vx/um/bflOiQhgHmFoJkIi5b4Erbjy5oxlC', 'Ark Woods'),
    ('stephen', '$2b$12$uJjJLJ81nFZUga73FdvNcOWcJOq3LipjOJXSbvpoOdmDHTQDGCS/a', 'Stephen Sanchez'),
    ('edward', '$2b$12$icdbuEOERUwTn.PJj0Vx/um/bflOiQhgHmFoJkIi5b4Erbjy5oxlC', 'Edward Sharpe')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO blogs (creator_name, creator_user_id, title, body, category, post_color, date_created)
SELECT seed.creator_name, seed.creator_user_id, seed.title, seed.body, seed.category, seed.post_color, seed.date_created
FROM (VALUES
    ('John Oates', 'john', 'Out of Touch', 'You''re out of touch. I''m out of time. But I''m out of my head when you''re not around', 'Other', 'Moss', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('Glenn Campbell', 'glenn', 'Gentle On My Mind', 'That keeps you in the back roads. By the rivers of my memory. That keeps you ever gentle on my mind', 'Tech', 'Midnight', CURRENT_TIMESTAMP - INTERVAL '4 days'),
    ('Ark Woods', 'ark', 'American Dream', 'Welcome to the new American Dream. Where you just got replaced by AI. I don''t want to dream about it. I never thought I''d go without it', 'Music', 'RosyBrown', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    ('Stephen Sanchez', 'stephen', 'Lady by the Sea', 'But, ooh, I love it. When you talk to me like you do. Oh, my lady by the sea, yeah. Come and lie next to me', 'Education', 'DarkGreen', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('Edward Sharpe', 'edward', '40 Day Dream', 'I''ve been, I''ve been sleepin'' for 40 days. Yeah, I know I''m sleeping, ''cause this dream''s too amazin''. She got gold doorknobs where her eyes used to be. One turn and I learned what it really means to see, yeah, uh. Ah, it''s the magical mystery kind. Ah, must be a lie, ah. Bye-bye to the too good to be true kinda love. Oh, I could die. Oh, now I could die', 'Other', 'Moss', CURRENT_TIMESTAMP - INTERVAL '1 day')
) AS seed(creator_name, creator_user_id, title, body, category, post_color, date_created)
WHERE NOT EXISTS (SELECT 1 FROM blogs);
