
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

const FILES_DIR = path.join(__dirname, "private", "files");

// Tutti i 17 certificati
const utenti = [
  {
    cognome: "SLIMANI",
    nome: "ABDELHAK",
    file: "SLIMANI ABDELHAK.pdf"
  },
  {
    cognome: "RCHOUK",
    nome: "YOUSSEF",
    file: "RCHOUK YOUSSEF (1).pdf"
  },
  {
    cognome: "ELAYAT",
    nome: "ALI",
    file: "ELAYAT ALI (1).pdf"
  },
  {
    cognome: "BAYOUD",
    nome: "ABDERRAHIM",
    file: "BAYOUD ABDERRAHIM.pdf"
  },
  {
    cognome: "GALI",
    nome: "AYOUB",
    file: "GALI AYOUB.pdf"
  },
  {
    cognome: "HAMOUCH",
    nome: "HASSAN",
    file: "HAMOUCH HASSAN.pdf"
  },
  {
    cognome: "ECH CHAJIY",
    nome: "SAIDA",
    file: "ECH CHAJIY SAIDA.pdf"
  },
  {
    cognome: "NAJI",
    nome: "HICHAM",
    file: "NAJI HICHAM.pdf"
  },
  {
    cognome: "AIT BEN GHALEM",
    nome: "AHMED",
    file: "AIT BEN GHALEM AHMED (1).pdf"
  },
  {
    cognome: "EL BADIDI",
    nome: "MOHAMED",
    file: "EL BADIDI MOHAMED (1).pdf"
  },
  {
    cognome: "EL OUAID",
    nome: "MINA",
    file: "EL OUAID MINA (1).pdf"
  },
  {
    cognome: "DAIFI",
    nome: "HASSAN",
    file: "DAIFI HASSAN (1).pdf"
  },
  {
    cognome: "SIMMOU",
    nome: "ELARABI",
    file: "SIMMOU ELARABI (1).pdf"
  },
  {
    cognome: "GHAZZI",
    nome: "LAMIA",
    file: "GHAZZI LAMIA.pdf"
  },
  {
    cognome: "REGGAB",
    nome: "FOUZIA",
    file: "REGGAB FOUZIA (1).pdf"
  },
  {
    cognome: "EL KASMI",
    nome: "HAFIDA",
    file: "EL KASMI HAFIDA (1).pdf"
  },
  {
    cognome: "AARAB",
    nome: "HALIMA",
    file: "AARAB HALIMA.pdf"
  }
];

// Normalizza cognomi e nomi
function pulisci(testo) {
  return String(testo ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[-']/g, " ")
    .replace(/\s+/g, " ");
}

// Token di download temporanei
const downloadTokens = new Map();

app.post("/api/verifica", (req, res) => {
  const cognome = pulisci(req.body?.cognome);
  const nome = pulisci(req.body?.nome);

  if (!cognome || !nome) {
    return res.status(400).json({
      ok: false,
      message: "Inserisci cognome e nome."
    });
  }

  const utente = utenti.find(u =>
    pulisci(u.cognome) === cognome &&
    pulisci(u.nome) === nome
  );

  if (!utente) {
    return res.status(401).json({
      ok: false,
      message: "Cognome o nome non valido."
    });
  }

  const filePath = path.join(FILES_DIR, utente.file);

  if (!fs.existsSync(filePath)) {
    console.error("Certificato mancante:", filePath);

    return res.status(404).json({
      ok: false,
      message: "Certificato non disponibile sul server."
    });
  }

  const token = crypto.randomBytes(32).toString("hex");

  downloadTokens.set(token, {
    file: utente.file,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  return res.json({
    ok: true,
    message: "Certificato trovato.",
    downloadUrl: `/api/download/${token}`
  });
});

// Scarica il certificato
app.get("/api/download/:token", (req, res) => {
  const token = req.params.token;
  const sessione = downloadTokens.get(token);

  if (!sessione) {
    return res.status(403).send("Link non valido.");
  }

  if (Date.now() > sessione.expiresAt) {
    downloadTokens.delete(token);
    return res.status(403).send("Link scaduto.");
  }

  const filePath = path.join(FILES_DIR, sessione.file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("PDF non trovato.");
  }

  downloadTokens.delete(token);

  res.download(filePath, sessione.file, err => {
    if (err) {
      console.error("Errore download:", err.message);

      if (!res.headersSent) {
        res.status(500).send(
          "Errore durante il download del certificato."
        );
      }
    }
  });
});

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Avvio
app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
  console.log(`Certificati configurati: ${utenti.length}`);
  console.log(`Cartella PDF: ${FILES_DIR}`);

  utenti.forEach(u => {
    const filePath = path.join(FILES_DIR, u.file);

    if (!fs.existsSync(filePath)) {
      console.warn(`FILE MANCANTE: ${u.file}`);
    }
  });
});
