CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade >= 0),
  valor_unidade NUMERIC(12, 2) NOT NULL CHECK (valor_unidade >= 0),
  categoria TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS movimentacoes (
  id SERIAL PRIMARY KEY,
  dt TIMESTAMP NOT NULL,
  tipo TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  id_produtos INTEGER NOT NULL REFERENCES produtos(id)
);

CREATE INDEX IF NOT EXISTS movimentacoes_dt_idx ON movimentacoes(dt);
CREATE INDEX IF NOT EXISTS movimentacoes_produto_idx ON movimentacoes(id_produtos);