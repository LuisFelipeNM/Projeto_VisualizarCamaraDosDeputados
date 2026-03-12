import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import 'dotenv/config';

const app = express();
app.use(cors());

const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.get('/api/grafo/:ano', async (req, res) => {
    const { ano } = req.params;

    try {
        const [nodesResult] = await dbPool.execute(
            `SELECT d.id, d.nome, a.partido, a.comunidade 
             FROM deputados d
             JOIN anos_atuacao a ON d.id = a.id_deputado
             WHERE a.ano = ?`,
            [ano]
        );

        const [linksResult] = await dbPool.execute(
            `SELECT source_id AS source, target_id AS target, concordancia 
             FROM links 
             WHERE ano = ?`,
            [ano]
        );

        res.json({
            nodes: nodesResult.map(node => ({
                id: node.id.toString(),
                nome: node.nome,
                partido: node.partido,
                comunidade: node.comunidade
            })),
            links: linksResult.map(link => ({
                source: link.source.toString(),
                target: link.target.toString(),
                concordancia: link.concordancia
            }))
        });

    } catch (error) {
        console.error("Erro ao buscar o grafo:", error);
        res.status(500).json({ erro: "Erro ao buscar dados do grafo" });
    }
});


app.get('/api/discursos/:deputadoId/:ano', async (req, res) => {
    const { deputadoId, ano } = req.params;

    try {
        const [rows] = await dbPool.execute(
            `SELECT conteudo AS sumario, 'Transcrição do Arquivo' AS tipo 
             FROM discursos 
             WHERE id_deputado = ? AND ano = ?`,
            [deputadoId, ano]
        );

        res.json({ discursos: rows });

    } catch (error) {
        console.error("Erro ao buscar discursos:", error);
        res.status(500).json({ erro: "Erro ao buscar discursos" });
    }
});

app.listen(3000, () => {
    console.log('Servidor (API JS) rodando com sucesso em http://localhost:3000');
});