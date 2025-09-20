@echo off
echo 🔧 FINAL FIX - Oprava migrácie raz a navždy
echo ============================================
echo.

echo 📋 Problém: Docker hľadá package.json v root priečinku, ale ten neexistuje
echo 💡 Riešenie: Vytvoríme správny package.json v root priečinku
echo.

echo 🚀 Spúšťam opravu...
echo.

echo Step 1: Pripojenie na server
ssh root@89.185.250.213 "cd /opt/earnings-table && ls -la package.json"

echo.
echo Step 2: Vytvorenie package.json v root priečinku
ssh root@89.185.250.213 "cd /opt/earnings-table && cat > package.json << 'EOF'
{
  \"name\": \"earnings-table-ubuntu\",
  \"version\": \"1.0.0\",
  \"private\": true,
  \"scripts\": {
    \"dev\": \"next dev\",
    \"build\": \"next build\",
    \"start\": \"next start\",
    \"lint\": \"next lint\",
    \"db:generate\": \"prisma generate\",
    \"db:push\": \"prisma db push\"
  },
  \"dependencies\": {
    \"@prisma/client\": \"^5.0.0\",
    \"next\": \"^15.0.0\",
    \"react\": \"^18.0.0\",
    \"react-dom\": \"^18.0.0\"
  },
  \"devDependencies\": {
    \"@types/node\": \"^20.0.0\",
    \"@types/react\": \"^18.0.0\",
    \"@types/react-dom\": \"^18.0.0\",
    \"prisma\": \"^5.0.0\",
    \"typescript\": \"^5.0.0\"
  }
}
EOF"

echo.
echo Step 3: Vytvorenie package-lock.json
ssh root@89.185.250.213 "cd /opt/earnings-table && cp src/queue/package-lock.json ./"

echo.
echo Step 4: Spustenie Docker build
ssh root@89.185.250.213 "cd /opt/earnings-table && docker-compose -f deployment/docker-compose.yml up -d --build"

echo.
echo Step 5: Testovanie portu 3000
timeout /t 30 /nobreak
curl http://89.185.250.213:3000

echo.
echo ✅ Oprava dokončená!
echo 🌐 Aplikácia by mala byť dostupná na: http://89.185.250.213:3000
echo.

pause

