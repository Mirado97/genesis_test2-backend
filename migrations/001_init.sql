-- ============================================================
-- 001_init.sql — начальная схема NFT-маркетплейса
-- ============================================================

-- Пользователи Telegram
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  tg_id       BIGINT        UNIQUE NOT NULL,
  first_name  VARCHAR(255)  NOT NULL,
  last_name   VARCHAR(255),
  username    VARCHAR(255),
  photo_url   TEXT,
  created_at  TIMESTAMP     DEFAULT NOW(),
  updated_at  TIMESTAMP     DEFAULT NOW()
);

-- Автообновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- EVM-кошельки пользователей
-- Логика: один chain_type на пользователя (UPSERT при повторной привязке)
CREATE TABLE IF NOT EXISTS wallets (
  id          SERIAL PRIMARY KEY,
  user_id     INT           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chain_type  VARCHAR(20)   NOT NULL DEFAULT 'evm',
  address     VARCHAR(42)   NOT NULL,
  created_at  TIMESTAMP     DEFAULT NOW(),
  UNIQUE(user_id, chain_type)    -- один кошелёк на тип сети
);

-- Индекс для быстрого поиска по адресу
CREATE INDEX IF NOT EXISTS wallets_address_idx ON wallets(LOWER(address));

-- NFT (демо-таблица, без смарт-контрактов)
CREATE TABLE IF NOT EXISTS nfts (
  id          SERIAL PRIMARY KEY,
  token_id    VARCHAR(100)  NOT NULL,
  contract    VARCHAR(42)   NOT NULL,
  name        VARCHAR(255)  NOT NULL,
  description TEXT,
  image_url   TEXT,
  owner_id    INT           REFERENCES users(id) ON DELETE SET NULL,
  price_eth   NUMERIC(18,8),
  for_sale    BOOLEAN       DEFAULT FALSE,
  created_at  TIMESTAMP     DEFAULT NOW()
);

-- Демо-данные NFT
INSERT INTO nfts (token_id, contract, name, description, image_url, price_eth, for_sale) VALUES
  ('1', '0x0000000000000000000000000000000000000001', 'CryptoPunk #1',   'Легендарный пиксельный персонаж',      'https://via.placeholder.com/400/6C63FF/fff?text=Punk+%231',   1.5,  TRUE),
  ('2', '0x0000000000000000000000000000000000000001', 'CryptoPunk #2',   'Редкий экземпляр с кепкой',            'https://via.placeholder.com/400/FF6584/fff?text=Punk+%232',   2.3,  TRUE),
  ('3', '0x0000000000000000000000000000000000000002', 'Bored Ape #42',   'Скучающая обезьяна в шляпе',           'https://via.placeholder.com/400/43BF9A/fff?text=Ape+%2342',   12.0, FALSE),
  ('4', '0x0000000000000000000000000000000000000002', 'Bored Ape #99',   'Золотой фон, редкость 0.1%',           'https://via.placeholder.com/400/F5A623/fff?text=Ape+%2399',   35.0, TRUE),
  ('5', '0x0000000000000000000000000000000000000003', 'Art Block #777',  'Генеративное искусство, серия Aurora', 'https://via.placeholder.com/400/E85D24/fff?text=Art+%23777',  0.8,  TRUE),
  ('6', '0x0000000000000000000000000000000000000003', 'Art Block #888',  'Синяя вселенная, 1 из 1000',           'https://via.placeholder.com/400/185FA5/fff?text=Art+%23888',  0.5,  TRUE)
ON CONFLICT DO NOTHING;
