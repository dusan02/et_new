# 🚀 Kompletnú Migrácia na Debian Server

## Server Info

- **IP**: 89.185.250.213
- **OS**: Debian 12
- **Login**: root
- **Heslo**: EJXTfBOG2t

## 📋 Migračný Plán

### Fáza 1: Príprava Servera

1. Pripojenie na server
2. Aktualizácia systému
3. Inštalácia Node.js 20.x
4. Inštalácia PostgreSQL 15
5. Inštalácia Redis
6. Inštalácia nginx
7. Konfigurácia firewall

### Fáza 2: Nastavenie Databázy

1. Vytvorenie PostgreSQL databázy
2. Konfigurácia užívateľa
3. Migrácia schémy z SQLite na PostgreSQL

### Fáza 3: Nasadenie Aplikácie

1. Klonovanie z GitHub
2. Inštalácia závislostí
3. Build produkčnej verzie
4. Konfigurácia environment variables

### Fáza 4: Konfigurácia Produkčných Služieb

1. PM2 pre Node.js aplikáciu
2. nginx reverse proxy
3. SSL certifikáty (Let's Encrypt)
4. Systemd služby
5. Webhook pre automatické deploymenty

### Fáza 5: Testovanie a Monitoring

1. Funkčné testy
2. Performance testy
3. Log monitoring
4. Backup systém

## 🛠️ Spustenie Migrácie

Použij pripravené scripty v tomto poradí:

1. `./migration-scripts/01-prepare-server.sh`
2. `./migration-scripts/02-setup-database.sh`
3. `./migration-scripts/03-deploy-app.sh`
4. `./migration-scripts/04-configure-production.sh`
5. `./migration-scripts/05-setup-monitoring.sh`

## 📞 Troubleshooting

Ak nastanú problémy, skontroluj:

- Logy v `/var/log/earnings-table/`
- PM2 status: `pm2 status`
- nginx status: `systemctl status nginx`
- PostgreSQL status: `systemctl status postgresql`
