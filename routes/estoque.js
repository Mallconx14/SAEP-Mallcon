const express = require("express");
const router = express.Router();
const db = require("../db");

function responderErro(res, mensagem, error) {
  console.error(mensagem, error.message);
  return res.status(500).json({ error: mensagem });
}

router.get("/produtos", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM produtos ORDER BY id");
    res.json(rows);
  } catch (error) {
    responderErro(res, "Erro ao buscar produtos", error);
  }
});

router.get("/categoria", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT categoria, SUM(quantidade * valor_unidade) AS total_categoria FROM produtos GROUP BY categoria");
    res.json(rows);
  } catch (error) {
    responderErro(res, "Erro ao buscar usuários", error);
  }
});

router.get("/decrescente", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM movimentacoes ORDER BY dt DESC");
    res.json(rows);
  } catch (error) {
    responderErro(res, "Erro ao buscar movimentações", error);
  }
});

router.post("/cadastrar", async (req, res) => {
  const { nome, quantidade, valor_unidade, categoria } = req.body;
  try {
    const { rows } = await db.query(
      "INSERT INTO produtos (nome, quantidade, valor_unidade, categoria) VALUES ($1, $2, $3, $4) RETURNING id",
      [nome, quantidade, valor_unidade, categoria]
    );
    res.json({ insertId: rows[0].id, affectedRows: 1 });
  } catch (error) {
    responderErro(res, "Erro ao inserir informações", error);
  }
});

router.post("/porcentagem", async (req, res) => {
  const limiteMaximo = req.body.limite_maximo || 100;
  const limiteMinimo = req.body.limite_minimo ?? 0;
  const sql = "SELECT id, nome, quantidade, categoria, " +
    "ROUND((quantidade::numeric / NULLIF($1::numeric, 0)) * 100, 2) AS percentual_atingido " +
    "FROM produtos WHERE quantidade <= $2 OR quantidade >= $3";

  try {
    const { rows } = await db.query(sql, [limiteMaximo, limiteMinimo, limiteMaximo]);
    res.json({
      filtros_aplicados: { minimo: limiteMinimo, maximo: limiteMaximo },
      produtos_no_limite: rows,
    });
  } catch (error) {
    responderErro(res, "Erro ao buscar o relatório de estoque", error);
  }
});

router.post("/registro", async (req, res) => {
  const { dt, tipo, quantidade, id_produtos } = req.body;
  try {
    const { rows } = await db.query(
      "INSERT INTO movimentacoes (dt, tipo, quantidade, id_produtos) VALUES ($1, $2, $3, $4) RETURNING id",
      [dt, tipo, quantidade, id_produtos]
    );
    res.json({ insertId: rows[0].id, affectedRows: 1 });
  } catch (error) {
    responderErro(res, "Erro ao inserir informações", error);
  }
});

router.post("/relatorio", async (req, res) => {
  const dataInicial = req.body.data_inicial;
  const dataFinal = req.body.data_final;

  if (!dataInicial || !dataFinal) {
    return res.status(400).json({ error: "As datas inicial e final são obrigatórias." });
  }

  const sql = "SELECT p.nome AS nome_produto, p.quantidade AS quantidade_atual, " +
    "SUM(CASE WHEN m.tipo = 'Entrada' THEN m.quantidade ELSE 0 END) AS total_entradas, " +
    "SUM(CASE WHEN m.tipo = 'Saída' THEN m.quantidade ELSE 0 END) AS total_saidas, " +
    "SUM(CASE WHEN m.tipo = 'Entrada' THEN m.quantidade ELSE 0 END) - " +
    "SUM(CASE WHEN m.tipo = 'Saída' THEN m.quantidade ELSE 0 END) AS saldo_periodo, " +
    "SUM(CASE WHEN m.tipo = 'Entrada' THEN m.quantidade * p.valor_unidade ELSE 0 END) AS financeiro_entradas, " +
    "SUM(CASE WHEN m.tipo = 'Saída' THEN m.quantidade * p.valor_unidade ELSE 0 END) AS financeiro_saidas " +
    "FROM produtos p JOIN movimentacoes m ON p.id = m.id_produtos " +
    "WHERE m.dt::date >= $1::date AND m.dt::date <= $2::date " +
    "GROUP BY p.id, p.nome, p.quantidade, p.valor_unidade";

  try {
    const { rows } = await db.query(sql, [dataInicial, dataFinal]);
    res.json({
      periodo: { inicio: dataInicial, fim: dataFinal },
      relatorio: rows,
    });
  } catch (error) {
    responderErro(res, "Erro ao gerar o relatório de movimentações", error);
  }
});

router.get("/maiores_saidas", async (req, res) => {
  const { data_inicio, data_fim } = req.query;

  if (!data_inicio || !data_fim) {
    return res.status(400).json({
      error: "As datas inicial (data_inicio) e final (data_fim) são obrigatórias.",
    });
  }

  const sql = "SELECT p.nome AS nome_produto, " +
    "SUM(m.quantidade) AS quantidade_total_saida, " +
    "SUM(m.quantidade * p.valor_unidade) AS valor_total_financeiro " +
    "FROM movimentacoes m INNER JOIN produtos p ON m.id_produtos = p.id " +
    "WHERE LOWER(m.tipo) IN ('saida', 'saída') " +
    "AND m.dt >= $1::date AND m.dt < ($2::date + INTERVAL '1 day') " +
    "GROUP BY p.id, p.nome ORDER BY quantidade_total_saida DESC";

  try {
    const { rows } = await db.query(sql, [data_inicio, data_fim]);
    res.json(rows);
  } catch (error) {
    responderErro(res, "Erro ao gerar o relatório de saídas.", error);
  }
});

module.exports = router;