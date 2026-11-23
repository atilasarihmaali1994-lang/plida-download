
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, "public");
const FILES_DIR = path.join(__dirname, "private", "files");

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));
app.use(express.static(PUBLIC_DIR));

// Elenco completo dei 17 certificati
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

// Normalizzazione cognome e nome
function pulisci(testo) {
  return String(testo ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[-'’]/g, " ")
    .replace(/\s+/g, " ");
}

// Token temporanei
const downloadTokens = new Map();

const TOKEN_DURATION = 10 * 60 * 1000;

// Pulizia periodica dei token scaduti
setInterval(() => {
  const now = Date.now();

  for (const [token, sessione] of downloadTokens) {
    if (sessione.expiresAt <= now) {
      downloadTokens.delete(token);
    }
  }
}, 60 * 1000).unref();

// Verifica disponibilità del PDF
async function verificaFile(nomeFile) {
  const filePath = path.join(FILES_DIR, nomeFile);

  try {
    const stats = await fs.promises.stat(filePath);
    return stats.isFile() ? filePath : null;
  } catch {
    return null;
  }
}

// API verifica certificato
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
      console.error(
        `[ERRORE] Certificato mancante: ${utente.file}`
      );

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

// API download certificato
app.get("/api/download/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const sessione = downloadTokens.get(token);

    if (!sessione) {
      return res.status(403).json({
        ok: false,
        message: "Link non valido o già utilizzato."
      });
    }

    if (Date.now() >= sessione.expiresAt) {
      downloadTokens.delete(token);

      return res.status(403).json({
        ok: false,
        message: "Link scaduto. Effettua una nuova ricerca."
      });
    }

    const filePath = await verificaFile(sessione.file);

    if (!filePath) {
      return res.status(404).json({
        ok: false,
        message: "File PDF non trovato."
      });
    }

    // Il token è utilizzabile una sola volta
    downloadTokens.delete(token);

    return res.download(filePath, sessione.file, error => {
      if (error) {
        console.error("Errore download:", error);

        if (!res.headersSent) {
          res.status(500).json({
            ok: false,
            message: "Errore durante il download."
          });
        }
      }
    });

  } catch (error) {
    console.error("Errore API download:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        message: "Errore interno del server."
      });
    }
  }
});

// Pagina principale
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// Endpoint per verificare che il server sia attivo
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    status: "online"
  });
});

// Gestione API inesistenti
app.use("/api", (req, res) => {
  res.status(404).json({
    ok: false,
    message: "Endpoint non trovato."
  });
});

// Avvio server
app.listen(PORT, async () => {
  console.log("--------------------------------");
  console.log("PORTALE CERTIFICATI PLIDA");
  console.log("--------------------------------");
  console.log(`Server attivo sulla porta ${PORT}`);
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
      console.error(`[MANCANTE] ${utente.file}`);
    }
  }

  console.log("--------------------------------");
  console.log(`PDF disponibili: ${disponibili}`);
  console.log(`PDF mancanti: ${mancanti}`);
  console.log("--------------------------------");
});
