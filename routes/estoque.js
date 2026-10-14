const express = require('express');
const router = express.Router();
const db  = require('../db');

router.get('/produtos', (req, res) => {
    const sql = 'SELECT * FROM produtos';
    db.query(sql, (err, results) => {
        if(err) {
            return res.status(500).json({ error: 'Erro ao buscar produtos'});
        } else {
            res.json(results);
        }
    });
});

router.get('/categoria', (req, res) => {
    db.query('SELECT categoria, SUM(quantidade * valor_unidade) AS total_categoria FROM produtos GROUP BY categoria', (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao buscar usuários' });
        } else {
            res.json(results);
        }
    });
});

router.get('/decrescente', (req, res) => {
    db.query('SELECT * FROM movimentacoes ORDER BY dt DESC', (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao buscar usuários' });
        } else {
            res.json(results);
        }
    });
}); 

router.post('/cadastrar', (req, res) => {
    const { nome, quantidade, valor_unidade, categoria } = req.body;
    db.query('INSERT INTO produtos (nome, quantidade, valor_unidade, categoria) VALUES (?, ?, ?, ?)', [nome, quantidade, valor_unidade, categoria], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao inserir informações', err});
        } else {
            res.json(results);
        }
    });
});

router.post('/porcentagem', (req, res) => {
    const limiteMaximo = req.body.limite_maximo || 100;
    const limiteMinimo = req.body.limite_minimo ?? 0;

    const sql = `
        SELECT 
            id, 
            nome, 
            quantidade, 
            categoria,
            ROUND((quantidade / ?) * 100, 2) AS percentual_atingido
        FROM produtos
        WHERE quantidade <= ? 
           OR quantidade >= ?
    `;

    db.query(sql, [limiteMaximo, limiteMinimo, limiteMaximo], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Erro ao buscar o relatório de estoque' });
        } else {
            res.json({
                filtros_aplicados: {
                    minimo: limiteMinimo,
                    maximo: limiteMaximo
                },
                produtos_no_limite: results
            });
        }
    });
});

router.post('/registro', (req, res) => {
    const { dt, tipo, quantidade, id_produtos } = req.body;
    db.query('INSERT INTO movimentacoes (dt, tipo, quantidade, id_produtos) VALUES (?, ?, ?, ?)', [dt, tipo, quantidade, id_produtos], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Erro ao inserir informações', err});
        } else {
            res.json(results);
        }
    });
});

router.post('/relatorio', (req, res) => {
    const dataInicial = req.body.data_inicial;
    const dataFinal = req.body.data_final;

    if (!dataInicial || !dataFinal) {
        return res.status(400).json({ error: 'As datas inicial e final são obrigatórias.' });
    }

    const sql = `
        SELECT 
            p.nome AS nome_produto,
            p.quantidade AS quantidade_atual,
            
            -- Total de Entradas
            SUM(CASE WHEN m.tipo = 'Entrada' THEN m.quantidade ELSE 0 END) AS total_entradas,
            
            -- Total de Saídas
            SUM(CASE WHEN m.tipo = 'Saída' THEN m.quantidade ELSE 0 END) AS total_saidas,
            
            -- Saldo do Período (Entradas - Saídas)
            SUM(CASE WHEN m.tipo = 'Entrada' THEN m.quantidade ELSE 0 END) - 
            SUM(CASE WHEN m.tipo = 'Saída' THEN m.quantidade ELSE 0 END) AS saldo_periodo,
            
            -- Valor Financeiro das Entradas (Total Entrada * Valor da Unidade)
            SUM(CASE WHEN m.tipo = 'Entrada' THEN (m.quantidade * p.valor_unidade) ELSE 0 END) AS financeiro_entradas,
            
            -- Valor Financeiro das Saídas (Total Saída * Valor da Unidade)
            SUM(CASE WHEN m.tipo = 'Saída' THEN (m.quantidade * p.valor_unidade) ELSE 0 END) AS financeiro_saidas

        FROM produtos p
        JOIN movimentacoes m ON p.id = m.id_produtos
        WHERE DATE(m.dt) >= ? AND DATE(m.dt) <= ?
        GROUP BY p.id, p.nome, p.quantidade, p.valor_unidade
    `;

    db.query(sql, [dataInicial, dataFinal], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Erro ao gerar o relatório de movimentações' });
        } else {
            res.json({
                periodo: {
                    inicio: dataInicial,
                    fim: dataFinal
                },
                relatorio: results
            });
        }
    });
});

router.get('/maiores_saidas', (req, res) => {
    const { data_inicio, data_fim } = req.query;

    if (!data_inicio || !data_fim) {
        return res.status(400).json({ error: 'As datas inicial (data_inicio) e final (data_fim) são obrigatórias.' });
    }

    const sql = `
        SELECT 
            p.nome AS nome_produto,
            SUM(m.quantidade) AS quantidade_total_saida,
            SUM(m.quantidade * p.valor_unidade) AS valor_total_financeiro
        FROM movimentacoes m
        INNER JOIN produtos p ON m.id_produtos = p.id
        WHERE m.tipo = 'saida' 
          AND m.dt BETWEEN ? AND ?
        GROUP BY p.id, p.nome
        ORDER BY quantidade_total_saida DESC;
    `;

    db.query(sql, [data_inicio, data_fim], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Erro ao gerar o relatório de saídas.' });
        } else {
            res.json(results);
        }
    });
});

module.exports = router;