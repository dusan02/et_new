# 🚀 Git Deployment Guide

## Prečo Git Deployment?

✅ **Automatický** - push do main = automatický deploy  
✅ **Spoľahlivý** - žiadne manuálne chyby  
✅ **Rýchly** - zmeny sú online za 2-3 minúty  
✅ **Bezpečný** - rollback je jednoduchý (git revert)

## 🔧 Setup GitHub Actions

### 1. Vytvor SSH kľúč na serveri

```bash
ssh-keygen -t rsa -b 4096 -C "deploy@earnings-table"
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
```

### 2. Pridaj secrets do GitHub

- `HOST`: 89.185.250.213
- `USERNAME`: root
- `SSH_KEY`: obsah súkromného kľúča

### 3. Push kód do GitHub

```bash
git add .
git commit -m "Add GitHub Actions deployment"
git push origin main
```

## 🎯 Výsledok

Po push do main branch:

1. GitHub Actions sa spustí automaticky
2. Pripojí sa na server cez SSH
3. Pullne najnovší kód
4. Spustí Docker build
5. Otestuje, či aplikácia funguje

## 🔄 Workflow

```bash
# Lokálne zmeny
git add .
git commit -m "Fix API endpoint"
git push origin main

# Automaticky:
# 1. GitHub Actions sa spustí
# 2. Deploy na server
# 3. Aplikácia je online za 2-3 minúty
```

## 🛠️ Alternatívne riešenia

### Git Hook na serveri

```bash
# Na serveri vytvor hook
cd /opt/earnings-table/.git/hooks
cat > post-receive << 'EOF'
#!/bin/bash
cd /opt/earnings-table
git pull origin main
docker-compose -f deployment/docker-compose.yml up -d --build
EOF
chmod +x post-receive
```

### Webhook deployment

```bash
# Vytvor webhook endpoint na serveri
# GitHub pošle POST request pri push
# Server automaticky deployne
```

## 🎉 Výhody

- **Žiadne manuálne kroky**
- **Automatický rollback** (git revert)
- **História zmien** (git log)
- **Testovanie pred deployom** (GitHub Actions)
- **Notifikácie** (email/Slack pri úspešnom/neúspešnom deployi)

## 🚀 Začni teraz!

1. Pushni kód do GitHub
2. Nastav GitHub Actions secrets
3. Pushni zmenu - deployment sa spustí automaticky!

