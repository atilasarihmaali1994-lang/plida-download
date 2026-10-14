const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

// Lista degli utenti autorizzati
const utenti = [
  {
    cognome: "METWALY",
    nome: "MOHAMED SHENDY MAHMOUD MOHAMED",
    file: "/files/Mohamed%20.pdf"
  },
  {
    cognome: "FEHIL",
    nome: "SAMAR KHAMIS RAMADAN KHAMIS",
    file: "/files/Samar.pdf"
  },
  {
    cognome: "FEHIL",
    nome: "AHMED KHAMIS RAMADAN MOUSA KHAMIS",
    file: "/files/Ahmed.pdf"
  }
]; // <-- CORRETTO: Chiusura dell'array aggiunta qui

// Funzione di utilità per pulire e normalizzare le stringhe
function pulisci(testo) {
  if (!testo) return "";
  return testo
    .toString()
    .trim()
    .toUpperCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

// Endpoint per la verifica dei dati
app.post("/api/verifica", (req, res) => {
  try {
    const cognome = pulisci(req.body.cognome);
    const nome = pulisci(req.body.nome);

    const utente = utenti.find(
      u => pulisci(u.cognome) === cognome && pulisci(u.nome) === nome
    );

    if (!utente) {
      return res.status(401).json({
        ok: false,
        message: "Dati non validi."
      });
    }

    return res.json({
      ok: true,
      downloadUrl: utente.file
    });
  } catch (error) {
    console.error("Errore durante la verifica:", error);
    return res.status(500, json({
      ok: false,
      message: "Errore interno del server."
    }));
  }
});

// Avvio del server
app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});