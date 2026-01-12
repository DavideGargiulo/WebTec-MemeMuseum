-- =========================================================
-- MEMEMUSEUM - PostgreSQL schema COMPLETO (V2) - NO ALTER TABLE
-- =========================================================
-- Include:
--  - Users (username + email opzionale) + password_hash (+ salt per compatibilità)
--  - Memes con metadata file + soft delete
--  - Tags normalizzati (Tag + MemeTag)
--  - Votes (MemeVote, CommentVote) con contatori denormalizzati
--  - Commenti thread (parent_id) + vincolo "stesso meme" via trigger
--  - Meme of the Day per giorno + selezione random pesata (anti-repeat)
--
-- Nota sicurezza:
--  - Per le password, in produzione usare Argon2/bcrypt/scrypt (hash lento).
--    In quel caso "salt" può anche sparire: l'hash include già i parametri/sale.
-- =========================================================

BEGIN;

-- =========================================================
-- EXTENSIONS
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;    -- case-insensitive text
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- trigram indexes

-- =========================================================
-- (Opzionale) RESET: decommenta se vuoi ricreare tutto da zero
-- =========================================================
-- DROP TABLE IF EXISTS meme_of_the_day CASCADE;
-- DROP TABLE IF EXISTS comment_vote CASCADE;
-- DROP TABLE IF EXISTS comment CASCADE;
-- DROP TABLE IF EXISTS meme_vote CASCADE;
-- DROP TABLE IF EXISTS meme_tag CASCADE;
-- DROP TABLE IF EXISTS tag CASCADE;
-- DROP TABLE IF EXISTS meme CASCADE;
-- DROP TABLE IF EXISTS app_user CASCADE;

-- =========================================================
-- TABLES
-- =========================================================

-- USERS
CREATE TABLE IF NOT EXISTS app_user (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username          citext NOT NULL UNIQUE,
  email             citext UNIQUE,
  email_verified_at timestamptz,
  password_hash     text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_username_not_empty CHECK (length(trim(username::text)) > 0),
  CONSTRAINT chk_email_not_empty CHECK (email IS NULL OR length(trim(email::text)) > 0)
);

-- MEMES
CREATE TABLE IF NOT EXISTS meme (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,

  -- File info (minimo)
  file_name          text NOT NULL,
  file_path          text NOT NULL,

  -- File metadata (migliorie)
  file_size          bigint,
  mime_type          varchar(100),
  file_hash          char(64),         -- es: SHA-256 esadecimale
  width              integer,
  height             integer,

  title              text NOT NULL,
  description        text,

  -- Contatori denormalizzati
  upvotes_number     integer NOT NULL DEFAULT 0,
  downvotes_number   integer NOT NULL DEFAULT 0,
  comments_number    integer NOT NULL DEFAULT 0,

  created_at         timestamptz NOT NULL DEFAULT now(),

  -- Soft delete
  deleted_at         timestamptz,

  -- Constraints
  CONSTRAINT chk_meme_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT chk_meme_counters_non_negative CHECK (
    upvotes_number >= 0 AND downvotes_number >= 0 AND comments_number >= 0
  ),
  CONSTRAINT chk_meme_file_size_positive CHECK (file_size IS NULL OR file_size > 0),
  CONSTRAINT chk_meme_mime_type_image CHECK (mime_type IS NULL OR mime_type ~* '^image/'),
  CONSTRAINT chk_meme_width_height_positive CHECK (
    (width IS NULL OR width > 0) AND (height IS NULL OR height > 0)
  ),

  -- Unique: consente più NULL (ok), evita duplicati se valorizzato
  CONSTRAINT uq_meme_file_hash UNIQUE (file_hash)
);

-- TAGS
CREATE TABLE IF NOT EXISTS tag (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  citext NOT NULL UNIQUE,
  CONSTRAINT chk_tag_name_not_empty CHECK (length(trim(name::text)) > 0)
);

-- MEME-TAG (N:M)
CREATE TABLE IF NOT EXISTS meme_tag (
  meme_id uuid NOT NULL REFERENCES meme(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES tag(id)  ON DELETE CASCADE,
  PRIMARY KEY (meme_id, tag_id)
);

-- MEME VOTES (1 voto per utente per meme)
CREATE TABLE IF NOT EXISTS meme_vote (
  user_id    uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  meme_id    uuid NOT NULL REFERENCES meme(id)     ON DELETE CASCADE,
  is_upvote  boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, meme_id)
);

-- COMMENTS (thread con parent_id)
CREATE TABLE IF NOT EXISTS comment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meme_id          uuid NOT NULL REFERENCES meme(id)     ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,

  content          text NOT NULL,
  parent_id        uuid REFERENCES comment(id) ON DELETE CASCADE,

  -- Contatori denormalizzati
  upvotes_number   integer NOT NULL DEFAULT 0,
  downvotes_number integer NOT NULL DEFAULT 0,
  comments_number  integer NOT NULL DEFAULT 0,  -- numero risposte (children)

  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_comment_content_not_empty CHECK (length(trim(content)) > 0),
  CONSTRAINT chk_comment_counters_non_negative CHECK (
    upvotes_number >= 0 AND downvotes_number >= 0 AND comments_number >= 0
  )
);

-- COMMENT VOTES (1 voto per utente per commento)
CREATE TABLE IF NOT EXISTS comment_vote (
  user_id    uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES comment(id)  ON DELETE CASCADE,
  is_upvote  boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

-- MEME OF THE DAY (1 record per giorno)
CREATE TABLE IF NOT EXISTS meme_of_the_day (
  day     date PRIMARY KEY,
  meme_id uuid NOT NULL REFERENCES meme(id) ON DELETE CASCADE
);

-- =========================================================
-- INDEXES
-- =========================================================

-- Meme: filtri e ordinamenti (solo non cancellati)
CREATE INDEX IF NOT EXISTS idx_meme_created_at_not_deleted
  ON meme(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_meme_upvotes_not_deleted
  ON meme(upvotes_number DESC, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_meme_downvotes_not_deleted
  ON meme(downvotes_number DESC, created_at DESC) WHERE deleted_at IS NULL;

-- Meme per utente
CREATE INDEX IF NOT EXISTS idx_meme_user_id ON meme(user_id);

-- Join Tag
CREATE INDEX IF NOT EXISTS idx_meme_tag_tag_id ON meme_tag(tag_id);
CREATE INDEX IF NOT EXISTS idx_meme_tag_meme_id ON meme_tag(meme_id);

-- Commenti: per meme e per thread
CREATE INDEX IF NOT EXISTS idx_comment_meme_id_created ON comment(meme_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comment_parent_id ON comment(parent_id);

-- Ricerca fuzzy (trigram)
CREATE INDEX IF NOT EXISTS idx_meme_title_trgm
  ON meme USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_meme_description_trgm
  ON meme USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tag_name_trgm
  ON tag USING gin (name gin_trgm_ops);

-- =========================================================
-- TRIGGERS & FUNCTIONS
-- =========================================================

-- -----------------------------
-- MEME_VOTE -> MEME counters
-- -----------------------------
CREATE OR REPLACE FUNCTION trg_meme_vote_after_insert()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_upvote THEN
    UPDATE meme SET upvotes_number = upvotes_number + 1 WHERE id = NEW.meme_id;
  ELSE
    UPDATE meme SET downvotes_number = downvotes_number + 1 WHERE id = NEW.meme_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_meme_vote_after_update()
RETURNS trigger AS $$
BEGIN
  IF (OLD.is_upvote = TRUE AND NEW.is_upvote = FALSE) THEN
    UPDATE meme
      SET upvotes_number = upvotes_number - 1,
          downvotes_number = downvotes_number + 1
    WHERE id = NEW.meme_id;

  ELSIF (OLD.is_upvote = FALSE AND NEW.is_upvote = TRUE) THEN
    UPDATE meme
      SET upvotes_number = upvotes_number + 1,
          downvotes_number = downvotes_number - 1
    WHERE id = NEW.meme_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_meme_vote_after_delete()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_upvote THEN
    UPDATE meme SET upvotes_number = upvotes_number - 1 WHERE id = OLD.meme_id;
  ELSE
    UPDATE meme SET downvotes_number = downvotes_number - 1 WHERE id = OLD.meme_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meme_vote_ai ON meme_vote;
DROP TRIGGER IF EXISTS meme_vote_au ON meme_vote;
DROP TRIGGER IF EXISTS meme_vote_ad ON meme_vote;

CREATE TRIGGER meme_vote_ai
AFTER INSERT ON meme_vote
FOR EACH ROW EXECUTE FUNCTION trg_meme_vote_after_insert();

CREATE TRIGGER meme_vote_au
AFTER UPDATE OF is_upvote ON meme_vote
FOR EACH ROW EXECUTE FUNCTION trg_meme_vote_after_update();

CREATE TRIGGER meme_vote_ad
AFTER DELETE ON meme_vote
FOR EACH ROW EXECUTE FUNCTION trg_meme_vote_after_delete();


-- -----------------------------
-- COMMENT_VOTE -> COMMENT counters
-- -----------------------------
CREATE OR REPLACE FUNCTION trg_comment_vote_after_insert()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_upvote THEN
    UPDATE comment SET upvotes_number = upvotes_number + 1 WHERE id = NEW.comment_id;
  ELSE
    UPDATE comment SET downvotes_number = downvotes_number + 1 WHERE id = NEW.comment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_comment_vote_after_update()
RETURNS trigger AS $$
BEGIN
  IF (OLD.is_upvote = TRUE AND NEW.is_upvote = FALSE) THEN
    UPDATE comment
      SET upvotes_number = upvotes_number - 1,
          downvotes_number = downvotes_number + 1
    WHERE id = NEW.comment_id;

  ELSIF (OLD.is_upvote = FALSE AND NEW.is_upvote = TRUE) THEN
    UPDATE comment
      SET upvotes_number = upvotes_number + 1,
          downvotes_number = downvotes_number - 1
    WHERE id = NEW.comment_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_comment_vote_after_delete()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_upvote THEN
    UPDATE comment SET upvotes_number = upvotes_number - 1 WHERE id = OLD.comment_id;
  ELSE
    UPDATE comment SET downvotes_number = downvotes_number - 1 WHERE id = OLD.comment_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comment_vote_ai ON comment_vote;
DROP TRIGGER IF EXISTS comment_vote_au ON comment_vote;
DROP TRIGGER IF EXISTS comment_vote_ad ON comment_vote;

CREATE TRIGGER comment_vote_ai
AFTER INSERT ON comment_vote
FOR EACH ROW EXECUTE FUNCTION trg_comment_vote_after_insert();

CREATE TRIGGER comment_vote_au
AFTER UPDATE OF is_upvote ON comment_vote
FOR EACH ROW EXECUTE FUNCTION trg_comment_vote_after_update();

CREATE TRIGGER comment_vote_ad
AFTER DELETE ON comment_vote
FOR EACH ROW EXECUTE FUNCTION trg_comment_vote_after_delete();


-- -----------------------------
-- COMMENT -> counters (meme/comments)
-- Se parent_id IS NULL: incrementa meme.comments_number
-- Se parent_id NOT NULL: incrementa parent_comment.comments_number
-- -----------------------------
CREATE OR REPLACE FUNCTION trg_comment_after_insert()
RETURNS trigger AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    UPDATE meme SET comments_number = comments_number + 1 WHERE id = NEW.meme_id;
  ELSE
    UPDATE comment SET comments_number = comments_number + 1 WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_comment_after_delete()
RETURNS trigger AS $$
BEGIN
  IF OLD.parent_id IS NULL THEN
    UPDATE meme SET comments_number = comments_number - 1 WHERE id = OLD.meme_id;
  ELSE
    UPDATE comment SET comments_number = comments_number - 1 WHERE id = OLD.parent_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comment_ai ON comment;
DROP TRIGGER IF EXISTS comment_ad ON comment;

CREATE TRIGGER comment_ai
AFTER INSERT ON comment
FOR EACH ROW EXECUTE FUNCTION trg_comment_after_insert();

CREATE TRIGGER comment_ad
AFTER DELETE ON comment
FOR EACH ROW EXECUTE FUNCTION trg_comment_after_delete();


-- -----------------------------
-- INTEGRITÀ THREAD:
-- parent comment deve appartenere allo stesso meme (non esprimibile con CHECK)
-- -----------------------------
CREATE OR REPLACE FUNCTION enforce_comment_parent_same_meme()
RETURNS trigger AS $$
DECLARE
  parent_meme uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT meme_id INTO parent_meme
  FROM comment
  WHERE id = NEW.parent_id;

  IF parent_meme IS NULL THEN
    RAISE EXCEPTION 'Parent comment % not found', NEW.parent_id;
  END IF;

  IF parent_meme <> NEW.meme_id THEN
    RAISE EXCEPTION 'Parent comment meme_id (%) differs from child meme_id (%)',
      parent_meme, NEW.meme_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comment_parent_same_meme ON comment;

CREATE TRIGGER trg_comment_parent_same_meme
BEFORE INSERT OR UPDATE OF parent_id, meme_id ON comment
FOR EACH ROW
EXECUTE FUNCTION enforce_comment_parent_same_meme();


-- =========================================================
-- MEME OF THE DAY (random pesato + anti-repeat)
-- =========================================================
-- Weighted random:
--   ORDER BY (-ln(random()) / weight) DESC
-- dove weight = GREATEST(1, (up - down) + 1)
-- Anti-repeat:
--   esclude i meme scelti negli ultimi p_avoid_days giorni
-- Soft delete:
--   considera solo meme con deleted_at IS NULL
CREATE OR REPLACE FUNCTION ensure_meme_of_the_day_weighted(
  p_day date DEFAULT current_date,
  p_avoid_days integer DEFAULT 14
)
RETURNS uuid AS $$
DECLARE
  chosen uuid;
BEGIN
  -- già scelto per quel giorno?
  SELECT meme_id INTO chosen
  FROM meme_of_the_day
  WHERE day = p_day;

  IF chosen IS NOT NULL THEN
    RETURN chosen;
  END IF;

  WITH recent AS (
    SELECT meme_id
    FROM meme_of_the_day
    WHERE day >= p_day - make_interval(days => p_avoid_days)
      AND day < p_day
  ),
  candidates AS (
    SELECT
      m.id,
      GREATEST(1, (m.upvotes_number - m.downvotes_number) + 1) AS weight
    FROM meme m
    WHERE m.deleted_at IS NULL
      AND m.id NOT IN (SELECT meme_id FROM recent)
  )
  SELECT id INTO chosen
  FROM candidates
  ORDER BY (-ln(random()) / weight) DESC
  LIMIT 1;

  -- fallback se tutti esclusi (pochi meme)
  IF chosen IS NULL THEN
    SELECT m.id INTO chosen
    FROM meme m
    WHERE m.deleted_at IS NULL
    ORDER BY (-ln(random()) / GREATEST(1, (m.upvotes_number - m.downvotes_number) + 1)) DESC
    LIMIT 1;
  END IF;

  IF chosen IS NULL THEN
    RAISE EXCEPTION 'No memes in database, cannot choose Meme of the Day';
  END IF;

  INSERT INTO meme_of_the_day(day, meme_id) VALUES (p_day, chosen);
  RETURN chosen;
END;
$$ LANGUAGE plpgsql;

CREATE VIEW popular_memes AS
SELECT *, (upvotes_number - downvotes_number) AS score
FROM meme
WHERE deleted_at IS NULL
ORDER BY score DESC, created_at DESC;

COMMIT;
