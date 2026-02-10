const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const PDFDocument = require("pdfkit");
const { Resend } = require("resend");

const app = express();
app.use(cors());
app.use(express.json());

// ========================
// BANCO DE DADOS (SQLite)
// ========================
const db = new sqlite3.Database("./database.db");

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

// ========================
// RESEND (EMAIL)
// ========================
const resend = new Resend(process.env.RESEND_API_KEY);

// ========================
// FUNÇÃO: GERAR CERTIFICADO
// ========================
function gerarCertificado(nome) {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });

    doc.fontSize(26).text("CERTIFICADO", { align: "center" });
    doc.moveDown(2);

    doc.fontSize(16).text(
      `Certificamos que ${nome} participou do evento com presença confirmada e avaliação registrada.`,
      { align: "center" }
    );

    doc.moveDown(2);
    doc.text("Carga horária: 8 horas", { align: "center" });
    doc.text(`Data: ${new Date().toLocaleDateString()}`, { align: "center" });

    doc.end();
  });
}

// ========================
// ROTAS
// ========================

// Teste
app.get("/", (req, res) => {
  res.send("API do Evento funcionando 🚀");
});

// INSCRIÇÃO
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

// PRESENÇA
app.post("/presenca/:id", (req, res) => {
  const id = req.params.id;

  db.run(
    "UPDATE participantes SET presente = 1 WHERE id = ?",
    [id],
    function () {
      if (this.changes === 0) {
        return res.status(404).json({ erro: "Participante não encontrado" });
      }
      res.json({ mensagem: "Presença confirmada" });
    }
  );
});

// AVALIAÇÃO
app.post("/avaliacao/:id", (req, res) => {
  const id = req.params.id;
  const { nota, comentario } = req.body;

  if (!nota || nota < 1 || nota > 5) {
    return res.status(400).json({ erro: "Nota deve ser entre 1 e 5" });
  }

  db.get(
    "SELECT presente FROM participantes WHERE id = ?",
    [id],
    (err, row) => {
      if (!row) {
        return res.status(404).json({ erro: "Participante não encontrado" });
      }

      if (!row.presente) {
        return res
          .status(403)
          .json({ erro: "Participante não esteve presente" });
      }

      db.run(
        "UPDATE participantes SET nota = ?, comentario = ? WHERE id = ?",
        [nota, comentario || "", id],
        () => {
          res.json({ mensagem: "Avaliação registrada" });
        }
      );
    }
  );
});

// LISTAR INSCRITOS
app.get("/inscritos", (req, res) => {
  db.all("SELECT * FROM participantes", [], (err, rows) => {
    res.json(rows);
  });
});

// CERTIFICADO (PDF + EMAIL)
app.post("/certificado/:id", (req, res) => {
  const id = req.params.id;

  db.get(
    "SELECT * FROM participantes WHERE id = ?",
    [id],
    async (err, participante) => {
      if (!participante) {
        return res.status(404).json({ erro: "Participante não encontrado" });
      }

      if (!participante.presente || !participante.nota) {
        return res.status(403).json({
          erro: "Certificado disponível somente para participantes presentes e avaliados"
        });
      }

      try {
        // 1️⃣ Gerar PDF
        const pdfBuffer = await gerarCertificado(participante.nome);

        // 2️⃣ Retornar PDF no navegador
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          "inline; filename=certificado.pdf"
        );
        res.end(pdfBuffer);

        // 3️⃣ Enviar email (1 vez por ação)
        resend.emails.send({
          from: "Certificados <onboarding@resend.dev>",
          to: participante.email,
          subject: "Seu certificado do evento",
          text: "Segue em anexo seu certificado de participação.",
          attachments: [
            {
              filename: "certificado.pdf",
              content: pdfBuffer.toString("base64")
            }
          ]
        })
        .then(() => {
          console.log("📧 Certificado reenviado para", participante.email);
        })
        .catch(err => {
          console.error("❌ Erro ao enviar email:", err.message);
        });

      } catch (error) {
        console.error("❌ Erro ao gerar certificado:", error);
      }
    }
  );
});


// ========================
// SERVIDOR
// ========================
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
