
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "public");

// Percorso attuale dei PDF su GitHub
const FILES_DIR = PUBLIC_DIR;

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

// Impedisce l'accesso diretto ai PDF tramite URL.
// Va eseguito prima di express.static().
app.use((req, res, next) => {
  if (/\.pdf$/i.test(req.path)) {
    return res.status(404).send("File non disponibile.");
  }
  next();
});

app.use(express.static(PUBLIC_DIR));

// Elenco dei 17 certificati
const utenti = [
  { cognome: "SLIMANI", nome: "ABDELHAK", file: "SLIMANI ABDELHAK.pdf" },
  { cognome: "RCHOUK", nome: "YOUSSEF", file: "RCHOUK YOUSSEF (1).pdf" },
  { cognome: "ELAYAT", nome: "ALI", file: "ELAYAT ALI (1).pdf" },
  { cognome: "BAYOUD", nome: "ABDERRAHIM", file: "BAYOUD ABDERRAHIM.pdf" },
  { cognome: "GALI", nome: "AYOUB", file: "GALI AYOUB.pdf" },
  { cognome: "HAMOUCH", nome: "HASSAN", file: "HAMOUCH HASSAN.pdf" },
  { cognome: "ECH CHAJIY", nome: "SAIDA", file: "ECH CHAJIY SAIDA.pdf" },
  { cognome: "NAJI", nome: "HICHAM", file: "NAJI HICHAM.pdf" },
  { cognome: "AIT BEN GHALEM", nome: "AHMED", file: "AIT BEN GHALEM AHMED (1).pdf" },
  { cognome: "EL BADIDI", nome: "MOHAMED", file: "EL BADIDI MOHAMED (1).pdf" },
  { cognome: "EL OUAID", nome: "MINA", file: "EL OUAID MINA (1).pdf" },
  { cognome: "DAIFI", nome: "HASSAN", file: "DAIFI HASSAN (1).pdf" },
  { cognome: "SIMMOU", nome: "ELARABI", file: "SIMMOU ELARABI (1).pdf" },
  { cognome: "GHAZZI", nome: "LAMIA", file: "GHAZZI LAMIA.pdf" },
  { cognome: "REGGAB", nome: "FOUZIA", file: "REGGAB FOUZIA (1).pdf" },
  { cognome: "EL KASMI", nome: "HAFIDA", file: "EL KASMI HAFIDA (1).pdf" },
  { cognome: "AARAB", nome: "HALIMA", file: "AARAB HALIMA.pdf" }
];

function pulisci(testo) {
  return String(testo ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[-'’]/g, " ")
    .replace(/\s+/g, " ");
}

const downloadTokens = new Map();
const TOKEN_DURATION = 10 * 60 * 1000;

// Verifica esistenza PDF
async function verificaFile(nomeFile) {
  const filePath = path.join(FILES_DIR, nomeFile);

  try {
    const stats = await fs.promises.stat(filePath);
    return stats.isFile() ? filePath : null;
  } catch {
    return null;
  }
}

// Ricerca certificato
app.post("/api/verifica", async (req, res) => {
  try {
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
        message: "Dati non validi."
      });
    }

    const filePath = await verificaFile(utente.file);

    if (!filePath) {
      console.error("PDF mancante:", utente.file);

      return res.status(404).json({
        ok: false,
        message: "Certificato non disponibile sul server."
      });
    }

    const token = crypto.randomBytes(32).toString("hex");

    downloadTokens.set(token, {
      file: utente.file,
      expiresAt: Date.now() + TOKEN_DURATION
    });

    return res.json({
      ok: true,
      message: "Certificato trovato.",
      downloadUrl: `/api/download/${token}`
    });

  } catch (error) {
    console.error("Errore verifica:", error);

    return res.status(500).json({
      ok: false,
      message: "Errore interno del server."
    });
  }
});

// Download certificato
app.get("/api/download/:token", async (req, res) => {
  const token = req.params.token;
  const sessione = downloadTokens.get(token);

  if (!sessione || Date.now() >= sessione.expiresAt) {
    downloadTokens.delete(token);

    return res.status(403).send(
      "Link non valido o scaduto. Effettua una nuova ricerca."
    );
  }

  const filePath = await verificaFile(sessione.file);

  if (!filePath) {
    return res.status(404).send("PDF non trovato.");
  }

  downloadTokens.delete(token);

  res.download(filePath, sessione.file, error => {
    if (error) {
      console.error("Errore download:", error.message);

      if (!res.headersSent) {
        res.status(500).send("Errore durante il download.");
      }
    }
  });
});

// Pagina principale
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// Controllo server
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    status: "online"
  });
});

// Pulizia token scaduti
setInterval(() => {
  const now = Date.now();

  for (const [token, sessione] of downloadTokens) {
    if (sessione.expiresAt <= now) {
      downloadTokens.delete(token);
    }
  }
}, 60000).unref();

// Avvio
app.listen(PORT, async () => {
  console.log("--------------------------------");
  console.log("PORTALE CERTIFICATI PLIDA");
  console.log("--------------------------------");
  console.log(`Porta: ${PORT}`);
  console.log(`Certificati configurati: ${utenti.length}`);
  console.log(`Cartella PDF: ${FILES_DIR}`);

  let disponibili = 0;
  let mancanti = 0;

  for (const utente of utenti) {
    const file = await verificaFile(utente.file);

    if (file) {
      disponibili++;
      console.log(`[OK] ${utente.file}`);
    } else {
      mancanti++;
      console.log(`[MANCANTE] ${utente.file}`);
    }
  }

  console.log("--------------------------------");
  console.log(`PDF disponibili: ${disponibili}`);
  console.log(`PDF mancanti: ${mancanti}`);
  console.log("--------------------------------");
});
