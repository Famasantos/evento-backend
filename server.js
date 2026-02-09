const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// "Banco de dados" em memória
let participantes = [];
let contadorId = 1;

// Rota teste
app.get("/", (req, res) => {
  res.status(200).send("API do Evento funcionando 🚀");
});

// 👉 ROTA DE INSCRIÇÃO
app.post("/inscricao", (req, res) => {
  const { nome, email } = req.body;

  // Validação básica
  if (!nome || !email) {
    return res.status(400).json({
      erro: "Nome e email são obrigatórios"
    });
  }

  const participante = {
    id: contadorId++,
    nome,
    email,
    presente: false,
    avaliacao: null
  };

  participantes.push(participante);

  res.status(201).json({
    mensagem: "Inscrição realizada com sucesso",
    participante
  });
});

// (opcional) listar inscritos
app.get("/inscritos", (req, res) => {
  res.json(participantes);
});

// Porta (Render)
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
// 👉 ROTA DE PRESENÇA
app.post("/presenca/:id", (req, res) => {
  const id = parseInt(req.params.id);

  const participante = participantes.find(p => p.id === id);

  if (!participante) {
    return res.status(404).json({
      erro: "Participante não encontrado"
    });
  }

  participante.presente = true;

  res.json({
    mensagem: "Presença confirmada com sucesso",
    participante
  });
});
