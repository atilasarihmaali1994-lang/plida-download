const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const utenti = [
  {
    cognome: "ECH-CHRIFI EL MILOUDI",
    nome: "MILOUDI",
    file: "/files/ech-chrifi-el-miloudi.pdf"
  },
  {
    cognome: "MIRINIOUI",
    nome: "FATIMA",
    file: "/files/mirinioui-fatima.pdf"
  },
  {
    cognome: "CHOKRI",
    nome: "AMAL",
    file: "/files/chokri-amal.pdf"
  }
];

function pulisci(testo) {
  return testo
    .toString()
    .trim()
    .toUpperCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

app.post("/api/verifica", (req, res) => {
  const cognome = pulisci(req.body.cognome || "");
  const nome = pulisci(req.body.nome || "");

  const utente = utenti.find(u =>
    pulisci(u.cognome) === cognome &&
    pulisci(u.nome) === nome
  );

  if (!utente) {
    return res.status(401).json({
      ok: false,
      message: "Dati non validi."
    });
  }

  res.json({
    ok: true,
    downloadUrl: utente.file
  });
});

app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});
