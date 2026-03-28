# Guida di Installazione — GISdesk

Questa guida copre l'installazione completa di GISdesk su un server Linux (Ubuntu/Debian) in produzione, con SSL tramite Let's Encrypt.

---

## Indice

1. [Requisiti di sistema](#1-requisiti-di-sistema)
2. [Installazione Docker](#2-installazione-docker)
3. [Scarica GISdesk](#3-scarica-gisdesk)
4. [Configurazione .env](#4-configurazione-env)
5. [Build e avvio](#5-build-e-avvio)
6. [Nginx + SSL con Let's Encrypt](#6-nginx--ssl-con-lets-encrypt)
7. [Primo accesso e setup](#7-primo-accesso-e-setup)
8. [Aggiornamenti](#8-aggiornamenti)
9. [Backup del database](#9-backup-del-database)
10. [Risoluzione problemi](#10-risoluzione-problemi)

---

## 1. Requisiti di sistema

| Requisito | Minimo | Consigliato |
|---|---|---|
| **OS** | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS |
| **RAM** | 1 GB | 2 GB |
| **CPU** | 1 vCPU | 2 vCPU |
| **Disco** | 10 GB | 20 GB |
| **Rete** | IP pubblico | IP pubblico + dominio |

> Un VPS da 5-10€/mese (Hetzner, OVH, DigitalOcean) è sufficiente per uso professionale.

---

## 2. Installazione Docker

Connettiti al server via SSH e installa Docker:

```bash
# Aggiorna il sistema
sudo apt update && sudo apt upgrade -y

# Installa Docker
curl -fsSL https://get.docker.com | sh

# Aggiungi il tuo utente al gruppo docker (evita di usare sudo ogni volta)
sudo usermod -aG docker $USER

# Riconnettiti per applicare il gruppo
exit
# ... riconnettiti via SSH ...

# Verifica
docker --version
docker compose version
```

---

## 3. Scarica GISdesk

```bash
# Clona il repository in /opt/gisdesk
sudo git clone https://github.com/fgianoli/gisdesk.git /opt/gisdesk

# Assegna la proprietà al tuo utente
sudo chown -R $USER:$USER /opt/gisdesk

cd /opt/gisdesk
```

---

## 4. Configurazione .env

```bash
cp .env.example .env
nano .env
```

Compila tutti i campi:

```env
# ── DATABASE ─────────────────────────────────
POSTGRES_DB=gisdesk
POSTGRES_USER=gisdesk
POSTGRES_PASSWORD=CAMBIA_CON_PASSWORD_FORTE   # ← obbligatorio

# ── JWT ──────────────────────────────────────
# Genera con: openssl rand -base64 48
JWT_SECRET=CAMBIA_CON_STRINGA_LUNGA_CASUALE   # ← obbligatorio

# ── SMTP ─────────────────────────────────────
SMTP_HOST=smtp.tuoprovider.com
SMTP_PORT=587
SMTP_USER=noreply@tuodominio.com
SMTP_PASS=password_smtp
SMTP_FROM=noreply@tuodominio.com

# ── FRONTEND URL ─────────────────────────────
# URL pubblico dell'applicazione (usato nei link delle email)
FRONTEND_URL=https://gisdesk.tuodominio.com   # ← obbligatorio

# ── OPENAI (opzionale) ───────────────────────
OPENAI_API_KEY=sk-...   # lascia vuoto per disabilitare l'AI Assistant
```

### Genera una JWT_SECRET sicura

```bash
openssl rand -base64 48
# Output esempio: K3mP9xQvN2wL8jR5tY0uI6oH4eA7sD1fG3hJ...
```

### Provider SMTP consigliati

| Provider | Host | Porta | Note |
|---|---|---|---|
| **Gmail** | `smtp.gmail.com` | 587 | Richiede "App Password" |
| **SendGrid** | `smtp.sendgrid.net` | 587 | Piano gratuito 100 email/gg |
| **Brevo (Sendinblue)** | `smtp-relay.brevo.com` | 587 | Piano gratuito 300 email/gg |
| **Mailgun** | `smtp.mailgun.org` | 587 | Pay-as-you-go |
| **Server proprio** | il tuo host | 25/587 | Verifica blacklist IP |

---

## 5. Build e avvio

```bash
cd /opt/gisdesk

# Build delle immagini Docker (prima volta: ~5 minuti)
docker compose build

# Avvio in background
docker compose up -d

# Verifica che tutto sia avviato
docker compose ps
```

Output atteso:
```
NAME                      STATUS    PORTS
gisdesk-postgres-1        Up        5432/tcp
gisdesk-backend-1         Up        4000/tcp
gisdesk-frontend-1        Up        0.0.0.0:3000->80/tcp
gisdesk-mailhog-1         Up        ...
```

> In questa fase GISdesk è accessibile su `http://IP_SERVER:3000` ma **senza SSL**.
> Per produzione continua al passo 6.

---

## 6. Nginx + SSL con Let's Encrypt

### Installa nginx e Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Configura nginx per GISdesk

```bash
sudo nano /etc/nginx/sites-available/gisdesk
```

Incolla questa configurazione:

```nginx
server {
    listen 80;
    server_name gisdesk.tuodominio.com;

    # Lascia questo blocco per la verifica Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect tutto il resto a HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name gisdesk.tuodominio.com;

    # SSL — i certificati vengono generati al passo successivo
    ssl_certificate     /etc/letsencrypt/live/gisdesk.tuodominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gisdesk.tuodominio.com/privkey.pem;

    # Parametri SSL moderni
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Header sicurezza
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;

    # Dimensione massima upload (allegati ticket, logo)
    client_max_body_size 25M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Necessario per SSE (notifiche real-time)
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }
}
```

### Abilita il sito

```bash
sudo ln -s /etc/nginx/sites-available/gisdesk /etc/nginx/sites-enabled/
sudo nginx -t      # verifica la sintassi
sudo systemctl reload nginx
```

### Ottieni il certificato SSL

```bash
sudo certbot --nginx -d gisdesk.tuodominio.com
```

Certbot configura tutto automaticamente e rinnova il certificato ogni 90 giorni.

### Verifica rinnovo automatico

```bash
sudo certbot renew --dry-run
```

---

## 7. Primo accesso e setup

Apri `https://gisdesk.tuodominio.com` nel browser.

### Credenziali iniziali
```
Email:    admin@ticketing.local
Password: admin123
```

> ⚠️ **Cambia subito la password** da Profilo → Modifica Password

### Configurazione iniziale consigliata

1. **Impostazioni → Generale**
   - Cambia il nome applicazione
   - Carica il tuo logo (PNG/SVG)

2. **Impostazioni → Email SMTP**
   - Configura le credenziali SMTP
   - Usa "Invia email di test" per verificare

3. **Utenti → Nuovo Utente**
   - Crea gli account per il team

4. **Progetti → Nuovo Progetto**
   - Crea il primo progetto
   - Assegna utenti con ruolo Manager o Membro

---

## 8. Aggiornamenti

Per aggiornare GISdesk all'ultima versione:

```bash
cd /opt/gisdesk

# Scarica gli aggiornamenti
git pull origin main

# Ricostruisci e riavvia
docker compose build
docker compose up -d

# Verifica i log
docker compose logs backend --tail=20
```

> Le migrazioni del database vengono applicate automaticamente all'avvio del backend.

---

## 9. Backup del database

### Backup manuale

```bash
# Crea backup
docker compose exec postgres pg_dump -U gisdesk gisdesk > backup_$(date +%Y%m%d_%H%M).sql

# Ripristina backup
docker compose exec -T postgres psql -U gisdesk gisdesk < backup_20240101_1200.sql
```

### Backup automatico giornaliero (cron)

```bash
sudo nano /etc/cron.d/gisdesk-backup
```

```cron
0 3 * * * root cd /opt/gisdesk && docker compose exec -T postgres pg_dump -U gisdesk gisdesk > /opt/backups/gisdesk_$(date +\%Y\%m\%d).sql && find /opt/backups -name "gisdesk_*.sql" -mtime +30 -delete
```

```bash
sudo mkdir -p /opt/backups
```

Questo crea un backup ogni notte alle 3:00 e cancella quelli più vecchi di 30 giorni.

---

## 10. Risoluzione problemi

### I container non si avviano

```bash
# Controlla i log
docker compose logs backend
docker compose logs postgres
docker compose logs frontend
```

### Il backend non si connette al database

Verifica che `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` nel `.env` corrispondano. Poi:

```bash
docker compose down
docker compose up -d
```

### Le email non arrivano

1. Vai in **Impostazioni → Email SMTP** e usa "Invia email di test"
2. Controlla i log del backend: `docker compose logs backend | grep SMTP`
3. Verifica che la porta 587 non sia bloccata dal firewall del server

### Errore 502 Bad Gateway

Il backend non è ancora pronto. Aspetta 30 secondi e riprova. Se persiste:

```bash
docker compose restart backend
docker compose logs backend --tail=30
```

### Il sito non è raggiungibile da fuori

```bash
# Verifica che nginx stia girando
sudo systemctl status nginx

# Verifica che la porta 3000 sia in ascolto
ss -tlnp | grep 3000

# Controlla il firewall
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
```

### Spazio su disco esaurito

```bash
# Pulisci immagini Docker inutilizzate
docker system prune -f

# Controlla spazio usato
df -h
du -sh /opt/gisdesk/
```

---

## Struttura dati persistenti

I dati vengono salvati in **volumi Docker** che sopravvivono ai riavvii:

| Volume | Contenuto |
|---|---|
| `postgres_data` | Database PostgreSQL |
| `uploads` | File allegati, logo, avatar |

Per vedere dove sono fisicamente:

```bash
docker volume inspect gisdesk_postgres_data
docker volume inspect gisdesk_uploads
```

---

## Supporto

- **Repository**: https://github.com/fgianoli/gisdesk
- **Sviluppato da**: [studiogis.eu](https://studiogis.eu)
