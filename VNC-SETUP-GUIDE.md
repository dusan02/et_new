# 🖥️ VNC Server Setup Guide - Riešenie SSH problémov

## Problém

Máte problémy s SSH terminálom a potrebujete grafické rozhranie pre správu servera.

## Riešenie

Nastavenie VNC servera, ktorý vám umožní grafické pripojenie k serveru cez VNC klienta.

## 🚀 Rýchle nastavenie

### Krok 1: Spustenie inštalačného skriptu

```bash
# Na vašom serveri spustite:
chmod +x setup-vnc-server.sh
./setup-vnc-server.sh
```

### Krok 2: Nastavenie bezpečnosti (voliteľné)

```bash
# Pre dodatočnú bezpečnosť:
chmod +x vnc-security-config.sh
./vnc-security-config.sh
```

## 📋 Čo skript urobí

1. **Nainštaluje potrebné balíky:**

   - Ubuntu desktop environment
   - XFCE4 (ľahké grafické rozhranie)
   - TightVNC server

2. **Nastaví VNC server:**

   - Vytvorí VNC konfiguráciu
   - Nastaví heslo pre VNC
   - Vytvorí systemd službu

3. **Nakonfiguruje firewall:**

   - Otvorí porty pre VNC
   - Nastaví bezpečnostné pravidlá

4. **Vytvorí užitočné skripty:**
   - Monitorovanie VNC
   - Zálohovanie konfigurácie
   - Restart VNC služby

## 🔌 Pripojenie k VNC serveru

### Metóda 1: Priame pripojenie (jednoduchšie)

1. Stiahnite si VNC Viewer: https://www.realvnc.com/download/viewer/
2. Nainštalujte VNC Viewer
3. Otvorte VNC Viewer
4. Zadajte IP adresu servera: `VASA_IP_ADRESA:5901`
5. Zadajte VNC heslo (ktoré ste nastavili počas inštalácie)

### Metóda 2: SSH tunel (bezpečnejšie)

1. Vytvorte SSH tunel na vašom počítači:
   ```bash
   ssh -L 5901:localhost:5901 root@VASA_IP_ADRESA
   ```
2. Pripojte sa cez VNC Viewer na: `localhost:5901`

## 🛠️ Užitočné príkazy

### Správa VNC služby

```bash
# Spustiť VNC
systemctl start vncserver@1

# Zastaviť VNC
systemctl stop vncserver@1

# Reštartovať VNC
systemctl restart vncserver@1

# Stav VNC
systemctl status vncserver@1

# Automatické spustenie pri štarte
systemctl enable vncserver@1
```

### Monitorovanie

```bash
# Spustiť monitorovací skript
./vnc-monitor.sh

# Zobraziť VNC procesy
ps aux | grep vnc

# Zobraziť aktívne pripojenia
netstat -tulpn | grep :5901
```

### Zálohovanie

```bash
# Zálohovať VNC konfiguráciu
./vnc-backup.sh

# Reštartovať VNC
./vnc-restart.sh
```

## 🔒 Bezpečnostné nastavenia

### Základné bezpečnostné funkcie

- ✅ VNC heslo
- ✅ Časový limit relácie (1 hodina)
- ✅ Časový limit nečinnosti (30 minút)
- ✅ Zakázané zdieľanie schránky
- ✅ Zakázaný prenos súborov
- ✅ Firewall konfigurácia

### Doporučené bezpečnostné opatrenia

1. **Používajte SSH tunel** namiesto priameho pripojenia
2. **Zmeňte VNC heslo** pravidelne
3. **Monitorujte pripojenia** pomocou `./vnc-monitor.sh`
4. **Aktualizujte systém** pravidelne
5. **Zvážte IP whitelist** v `/home/root/.vnc/hosts.allow`

## 🆘 Riešenie problémov

### VNC sa nespustí

```bash
# Skontrolujte logy
journalctl -u vncserver@1 -f

# Reštartujte službu
systemctl restart vncserver@1

# Skontrolujte konfiguráciu
cat /home/root/.vnc/xstartup
```

### Nemôžem sa pripojiť

1. Skontrolujte, či je VNC spustený: `systemctl status vncserver@1`
2. Skontrolujte firewall: `ufw status`
3. Skontrolujte IP adresu: `curl ifconfig.me`
4. Skúste SSH tunel namiesto priameho pripojenia

### Grafické rozhranie nefunguje

```bash
# Reštartujte VNC s novou konfiguráciou
systemctl stop vncserver@1
rm -rf /home/root/.vnc/X*
systemctl start vncserver@1
```

## 📱 VNC klienti pre rôzne platformy

### Windows

- **RealVNC Viewer** (odporúčané)
- **TightVNC Viewer**
- **UltraVNC Viewer**

### macOS

- **RealVNC Viewer**
- **VNC Viewer** (App Store)

### Linux

- **Remmina**
- **Vinagre**
- **RealVNC Viewer**

### Android/iOS

- **VNC Viewer** (RealVNC)

## 🎯 Výhody VNC oproti SSH

1. **Grafické rozhranie** - vidíte desktop servera
2. **Jednoduchšie ovládanie** - myš a klávesnica
3. **Vizuálna správa** - vidíte, čo sa deje
4. **Webové prehliadače** - môžete otvárať webové stránky
5. **Grafické aplikácie** - môžete spúšťať GUI aplikácie

## 📞 Podpora

Ak máte problémy s nastavením VNC:

1. Skontrolujte logy: `journalctl -u vncserver@1 -f`
2. Spustite monitorovací skript: `./vnc-monitor.sh`
3. Skúste reštart: `./vnc-restart.sh`
4. Skontrolujte firewall: `ufw status`

---

**Poznámka:** VNC server je teraz pripravený na použitie. Po spustení inštalačného skriptu budete môcť pripojiť sa graficky k vášmu serveru a spravovať ho bez problémov s SSH terminálom.
