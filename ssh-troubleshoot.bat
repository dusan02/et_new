@echo off
REM SSH Troubleshooting Script for Windows
REM Helps diagnose SSH connection issues to 89.185.250.213

echo ========================================
echo     SSH Connection Troubleshooting
echo ========================================
echo Server: 89.185.250.213
echo Password: EJXTfBOG2t
echo.

echo [1] Testing basic connectivity...
ping -n 4 89.185.250.213

echo.
echo [2] Testing SSH port 22...
telnet 89.185.250.213 22

echo.
echo ========================================
echo     SSH Connection Methods to Try
echo ========================================
echo.

echo Method 1 - Basic SSH with password:
echo ssh root@89.185.250.213
echo ssh user@89.185.250.213
echo ssh ubuntu@89.185.250.213
echo ssh debian@89.185.250.213
echo.

echo Method 2 - SSH with explicit password (if sshpass is available):
echo sshpass -p "EJXTfBOG2t" ssh root@89.185.250.213
echo sshpass -p "EJXTfBOG2t" ssh user@89.185.250.213
echo.

echo Method 3 - SSH with verbose output for debugging:
echo ssh -v root@89.185.250.213
echo ssh -vv root@89.185.250.213
echo.

echo Method 4 - Try different SSH clients:
echo putty.exe -ssh 89.185.250.213 -l root -pw EJXTfBOG2t
echo.

echo ========================================
echo     Common SSH Issues and Solutions
echo ========================================
echo.

echo Issue 1: Wrong username
echo - Try: root, user, ubuntu, debian, admin
echo.

echo Issue 2: SSH service not running
echo - Server might need SSH service restart
echo.

echo Issue 3: Firewall blocking SSH
echo - Port 22 might be blocked
echo - Try alternative ports: 2222, 22022
echo.

echo Issue 4: Key-based authentication required
echo - Server might require SSH keys instead of password
echo.

echo Issue 5: Password authentication disabled
echo - Server config might have "PasswordAuthentication no"
echo.

echo ========================================
echo     Alternative Access Methods
echo ========================================
echo.

echo 1. Web-based SSH (if available):
echo    - Check hosting provider's control panel
echo    - Look for web terminal or SSH access
echo.

echo 2. VPS Console Access:
echo    - Login to your hosting provider
echo    - Use VNC/Console access
echo.

echo 3. Remote Desktop (if Windows server):
echo    - Try RDP connection on port 3389
echo.

echo ========================================
echo     Commands to Run Once Connected
echo ========================================
echo.

echo # Fix the current application
echo cd /var/www/earnings-table
echo npm ci --production
echo npx prisma generate  
echo npm run build
echo pm2 restart all
echo.

echo # Or deploy fresh HTTPS version
echo wget https://raw.githubusercontent.com/your-repo/deploy-https-production.sh
echo chmod +x deploy-https-production.sh
echo bash deploy-https-production.sh
echo.

pause
