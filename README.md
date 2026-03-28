# GISdesk

**Helpdesk & Project Management** — sistema dockerizzato per la gestione di ticket, progetti e team, sviluppato da [studiogis.eu](https://studiogis.eu).

---

## Cos'è GISdesk

GISdesk è una piattaforma web completa per la gestione del supporto tecnico e dei progetti. Permette di tracciare ticket di assistenza, monitorare SLA, coordinare il team su progetti con Gantt e TODO list, e comunicare con i clienti tramite notifiche email e in-app.

È pensato per aziende di medie dimensioni che hanno bisogno di un sistema professionale, self-hosted, senza dipendere da servizi esterni a pagamento come Zendesk o Jira.

---

## Funzionalità principali

### 🎫 Gestione Ticket
- Creazione ticket con priorità (Bassa, Media, Alta, Critica, Feature Request)
- Assegnazione a utenti specifici del progetto
- Tipi ticket: **Standard** (visibili ai clienti) e **Servizio** (solo admin)
- Commenti, storia delle modifiche, allegati (immagini, PDF, documenti)
- **SLA automatico** — deadline calcolata in base alle ore configurate per progetto
- Escalation automatica: notifica i manager quando un ticket è in scadenza entro 2 ore
- Dipendenze tra ticket (blocca/è bloccato da)
- Tracciamento ore lavorate per ticket
- **Template ticket** — modelli predefiniti per tipologie ricorrenti
- **Bulk operations** — chiudi, assegna o cambia priorità a più ticket in una volta
- **Import da CSV** — migrazione da altri sistemi

### 📁 Gestione Progetti
- Stato progetto: Attivo, In pausa, Completato, Archiviato
- **Gantt interattivo** — pianificazione temporale con attività e sottoattività
- **TODO list** — con scadenze, assegnazione utente e ricorrenza
- Collegamento tra task Gantt e TODO list
- **FAQ** — domande frequenti per progetto, usate anche dall'AI Assistant
- **Documenti** — testo formattato + file allegati (PDF, immagini, archivi)
- Assegnazione ruoli per progetto: **Manager** (riceve notifiche ticket) e **Membro**

### 👥 Gestione Utenti
- Ruoli globali: **Admin** (accesso completo) e **Client** (accesso limitato ai propri progetti)
- Profilo utente con avatar, telefono, azienda
- I client vedono solo i ticket dei propri progetti

### 🔔 Notifiche
- **Email** — su creazione ticket, aggiornamenti, commenti, avvisi SLA
- **In-app** — campanella con badge, dropdown in tempo reale via SSE
- **Report settimanale** — ogni lunedì riepilogo ticket e SLA via email agli admin
- **Webhook** — integrazione con Slack, Teams o sistemi esterni (con HMAC signature)

### 🤖 AI Assistant
- Chat integrata per progetto alimentata da OpenAI GPT-4o-mini
- Risponde basandosi su FAQ, documenti e ticket risolti del progetto
- Opzionale: si disabilita lasciando vuota la variabile `OPENAI_API_KEY`

### 📊 Analytics
- Panoramica ticket aperti, risolti, in scadenza SLA
- Conformità SLA in percentuale
- Tempo medio di risoluzione

### 🔒 Sicurezza
- Autenticazione JWT (7 giorni)
- **2FA TOTP** — Google Authenticator / Authy
- Rate limiting su login e API
- Audit log completo — chi ha fatto cosa e quando
- Sanitizzazione input contro XSS
- Helmet.js per header di sicurezza

### 🎨 Interfaccia
- **Dark mode** — palette moderna indigo/slate, persistente tra sessioni
- **Mobile responsive** — sidebar collassabile su smartphone
- **PWA** — installabile su desktop e mobile come app nativa
- Logo e nome applicazione personalizzabili dall'admin
- Font Inter, design system con CSS variables

### 🔧 Impostazioni Admin
- SMTP configurabile da interfaccia (no riavvio necessario)
- Upload logo personalizzato (PNG, SVG, WebP)
- Rinomina applicazione
- Gestione webhook
- Filtri salvati per ticket
- Campi personalizzati per ticket per progetto

---

## Stack tecnologico

| Layer | Tecnologia |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS |
| **Backend** | Node.js, Express, TypeScript |
| **ORM** | Prisma v5 |
| **Database** | PostgreSQL 16 |
| **Auth** | JWT + bcrypt + TOTP (speakeasy) |
| **Email** | Nodemailer |
| **AI** | OpenAI API (GPT-4o-mini) |
| **Real-time** | Server-Sent Events (SSE) |
| **Upload** | Multer |
| **Proxy** | nginx (Alpine) |
| **Containerizzazione** | Docker + Docker Compose |
| **Dev mail** | Mailhog |

---

## Avvio in sviluppo locale

### Prerequisiti
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git

### 1. Clona il repository
```bash
git clone https://github.com/fgianoli/gisdesk.git
cd gisdesk
```

### 2. Crea il file di configurazione
```bash
cp .env.example .env
```

Per lo sviluppo locale non serve cambiare nulla — Mailhog cattura tutte le email.

### 3. Avvia i container
```bash
docker-compose build
docker-compose up -d
```

### 4. Accedi
| Servizio | URL | Credenziali |
|---|---|---|
| **GISdesk** | http://localhost:3000 | `admin@ticketing.local` / `admin123` |
| **Mailhog** (email) | http://localhost:8025 | — |

> ⚠️ Cambia la password dell'admin subito dopo il primo accesso.

---

## Installazione in produzione

### 1. Prerequisiti server
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. Clona e configura
```bash
git clone https://github.com/fgianoli/gisdesk.git /opt/gisdesk
cd /opt/gisdesk
cp .env.example .env
nano .env
```

Valori **obbligatori** da impostare:

```env
POSTGRES_PASSWORD=password_forte_qui
JWT_SECRET=stringa_casuale_min_48_chars   # genera con: openssl rand -base64 48
SMTP_HOST=smtp.tuoprovider.com
SMTP_USER=noreply@tuodominio.com
SMTP_PASS=password_smtp
SMTP_FROM=noreply@tuodominio.com
FRONTEND_URL=https://gisdesk.tuodominio.com
```

### 3. Build e avvio
```bash
docker-compose build
docker-compose up -d
```

### 4. Reverse proxy nginx con SSL
Se usi nginx esterno per la gestione SSL:

```nginx
server {
    listen 443 ssl;
    server_name gisdesk.tuodominio.com;

    ssl_certificate     /etc/letsencrypt/live/tuodominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tuodominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Necessario per SSE (notifiche real-time)
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }
}
```

### 5. Aggiornamenti futuri
```bash
cd /opt/gisdesk
git pull
docker-compose build
docker-compose up -d
```

---

## Struttura del repository

```
gisdesk/
├── docker-compose.yml          # Orchestrazione container
├── .env.example                # Template variabili d'ambiente
│
├── backend/                    # API Node.js + Express
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma       # Modello dati
│   │   ├── migrations/         # Migrazioni DB
│   │   └── seed.ts             # Dati iniziali (utente admin)
│   └── src/
│       ├── index.ts            # Entry point
│       ├── routes/             # Rotte API
│       ├── services/           # Email, SLA
│       ├── middleware/         # Auth, validazione
│       └── config/
│
└── frontend/                   # React + Vite
    ├── Dockerfile
    ├── nginx.conf              # Serve SPA + proxy /api/
    └── src/
        ├── pages/              # Pagine applicazione
        ├── components/         # Componenti riutilizzabili
        ├── context/            # Auth, Theme, AppSettings
        ├── api/                # Client Axios
        └── types/              # Tipi TypeScript
```

---

## API REST

Il backend espone le seguenti rotte su `/api/`:

| Rotta | Descrizione |
|---|---|
| `/auth` | Login, profilo corrente |
| `/users` | Gestione utenti (admin) |
| `/projects` | Gestione progetti |
| `/tickets` | Ticket CRUD, commenti, storia |
| `/timeline` | Gantt items |
| `/todos` | TODO list |
| `/faq` | FAQ e documenti progetto |
| `/ai` | AI Assistant (OpenAI) |
| `/notifications` | Notifiche in-app |
| `/sse/subscribe` | Stream real-time (SSE) |
| `/analytics` | Statistiche (admin) |
| `/templates` | Template ticket |
| `/bulk/tickets` | Operazioni bulk |
| `/audit` | Audit log (admin) |
| `/webhooks` | Webhook integrations |
| `/custom-fields` | Campi personalizzati |
| `/saved-filters` | Filtri salvati utente |
| `/2fa` | Setup/enable/disable TOTP |
| `/import/tickets` | Import da CSV |
| `/settings` | Impostazioni sistema (admin) |
| `/settings/public` | Nome e logo app (pubblico) |

---

## Licenza

Apache 2.0 — vedi [LICENSE](LICENSE)

---

## Sviluppato da

[**studiogis.eu**](https://studiogis.eu) — GIS, sviluppo software e soluzioni digitali per il territorio.
