# 🪟 Windows Deployment Guide

## Problém ktorý si mal

Pokúsil si sa spustiť **Linux príkazy vo Windows PowerShell** - to nefunguje! ❌

```powershell
# ❌ TOTO NEFUNGUJE VO WINDOWS:
cd /var/www/earnings-table    # Linux cesta
chmod +x *.sh                  # Linux príkaz
./cleanup-crlf.sh              # Bash skript
```

---

## ✅ Správne riešenie

### Krok 1: Push je hotový ✅

```powershell
git push origin main  # ✅ Už hotové!
```

### Krok 2: Pripoj sa na server

**Možnosť A - PowerShell script (automaticky):**

```powershell
.\deploy-to-production.ps1
```

_(Pred spustením UPRAV IP/hostname v skripte)_

**Možnosť B - Manuálne cez SSH (odporúčané):**

#### 1. Otvor nový PowerShell/Terminal

#### 2. Pripoj sa na server:

```powershell
ssh root@89.185.250.213
# alebo
ssh root@bardus
# alebo tvoj hostname
```

#### 3. Spusti deployment príkazy (NA SERVERI):

```bash
cd /var/www/earnings-table

# Pull zmeny
git pull origin main

# Nastav executable
chmod +x *.sh

# Cleanup (jednorazovo)
./cleanup-crlf.sh

# Restore data
./immediate-data-restore.sh

# Validation
./post-hotfix-check.sh
```

---

## 🔍 Poznámky

### Windows PowerShell vs Linux Bash

| Príkaz            | Windows PowerShell | Linux Bash           |
| ----------------- | ------------------ | -------------------- |
| Zmena priečinku   | `cd C:\folder`     | `cd /var/folder`     |
| Zoznam súborov    | `dir` alebo `ls`   | `ls -la`             |
| Spustenie skriptu | `.\script.ps1`     | `./script.sh`        |
| Executable flag   | N/A                | `chmod +x script.sh` |

### SSH Connection

Ak nemáš SSH klient vo Windows:

1. Windows 10/11 má SSH built-in ✅
2. Alebo použi **PuTTY**: https://www.putty.org/
3. Alebo **WSL** (Windows Subsystem for Linux)

### IP/Hostname servera

Z predošlých logov vidím:

- IP: `89.185.250.213`
- Možný hostname: `bardus`

Použite: `ssh root@89.185.250.213`

---

## 🎯 Quick Steps Summary

### Vo WINDOWS (lokálne):

```powershell
# Git operations
cd D:\Projects\EarningsTableUbuntu
git add .
git commit -m "message"
git push origin main
```

### Na LINUX SERVERI (cez SSH):

```bash
# Deployment operations
cd /var/www/earnings-table
git pull origin main
chmod +x *.sh
./immediate-data-restore.sh
```

**Nikdy nemieš tieto dva svety! 😊**

---

## 🆘 Troubleshooting

### "ssh: command not found"

Windows 10/11 má SSH built-in. Ak nefunguje:

```powershell
# Install OpenSSH Client (PowerShell as Admin)
Add-WindowsCapability -Online -Name OpenSSH.Client*
```

### "Permission denied (publickey)"

```powershell
# Použij password authentication
ssh -o PreferredAuthentications=password root@89.185.250.213
```

### "Host key verification failed"

```powershell
# First time connecting - type "yes"
# Or remove old key:
ssh-keygen -R 89.185.250.213
```

---

## ✅ Next Steps

1. ✅ **Git push** - Hotové!
2. ⏭️ **SSH pripojenie** - Urob teraz
3. ⏭️ **Deployment skripty** - Spusti na serveri
4. ⏭️ **Validácia** - Skontroluj https://www.earningstable.com

**Ideš na to!** 🚀
