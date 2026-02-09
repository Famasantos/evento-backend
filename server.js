const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com banco SQLite
const db = new sqlite3.Database("./database.db");

// Criar tabela
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS participantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      presente INTEGER DEFAULT 0,
      nota INTEGER,
      comentario TEXT
    )
  `);
});

// Rota teste
app.get("/", (req, res) => {
  res.send("API do Evento funcionando 🚀");
});

// 👉 INSCRIÇÃO
app.post("/inscricao", (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: "Nome e email obrigatórios" });
  }

  db.run(
    "INSERT INTO participantes (nome, email) VALUES (?, ?)",
    [nome, email],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      res.status(201).json({
        mensagem: "Inscrição realizada com sucesso",
        id: this.lastID
      });
    }
  );
});

// 👉 PRESENÇA
app.post("/presenca/:id", (req, res) => {
  const id = req.params.id;

  db.run(
    "UPDATE participantes SET presente = 1 WHERE id = ?",
    [id],
    function (err) {
      if (this.changes === 0) {
        return res.status(404).json({ erro: "Participante não encontrado" });
      }
      res.json({ mensagem: "Presença confirmada" });
    }
  );
});

// 👉 AVALIAÇÃO
app.post("/avaliacao/:id", (req, res) => {
  const id = req.params.id;
  const { nota, comentario } = req.body;

  if (!nota || nota < 1 || nota > 5) {
    return res.status(400).json({ erro: "Nota inválida" });
  }

  db.get(
    "SELECT presente FROM participantes WHERE id = ?",
    [id],
    (err, row) => {
      if (!row) {
        return res.status(404).json({ erro: "Participante não encontrado" });
      }

      if (!row.presente) {
        return res.status(403).json({ erro: "Participante não esteve presente" });
      }

      db.run(
        "UPDATE participantes SET nota = ?, comentario = ? WHERE id = ?",
        [nota, comentario, id],
        () => {
          res.json({ mensagem: "Avaliação registrada" });
        }
      );
    }
  );
});

// 👉 LISTAR INSCRITOS
app.get("/inscritos", (req, res) => {
  db.all("SELECT * FROM participantes", [], (err, rows) => {
    res.json(rows);
  });
});

// Porta (Render)
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
