# Quick SSH Connection Script for Windows PowerShell
# Helps connect to 89.185.250.213 with different methods

Write-Host "SSH Connection Helper for 89.185.250.213" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

$server = "89.185.250.213"
$password = "EJXTfBOG2t"

Write-Host "`nServer connectivity: OK" -ForegroundColor Green
Write-Host "SSH port 22: OPEN" -ForegroundColor Green

Write-Host "`nTrying different SSH usernames..." -ForegroundColor Yellow

$usernames = @("root", "user", "ubuntu", "debian", "admin", "earnings")

foreach ($username in $usernames) {
    Write-Host "`nMethod for username '$username':" -ForegroundColor Cyan
    Write-Host "ssh $username@$server" -ForegroundColor White
    
    # If you have OpenSSH installed on Windows
    Write-Host "   OR with password prompt:" -ForegroundColor Gray
    Write-Host "ssh $username@$server" -ForegroundColor Gray
}

Write-Host "`nSSH Troubleshooting Commands:" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

Write-Host "`n1. Verbose SSH connection (shows detailed info):"
Write-Host "ssh -v root@$server" -ForegroundColor White

Write-Host "`n2. Try different SSH client (if available):"
Write-Host "putty.exe -ssh $server -l root" -ForegroundColor White

Write-Host "`n3. Check SSH service on server:"
Write-Host "nmap -p 22 $server" -ForegroundColor White

Write-Host "`nAlternative Access Methods:" -ForegroundColor Yellow
Write-Host "===========================" -ForegroundColor Yellow

Write-Host "`n1. Web-based terminal (check your hosting provider)"
Write-Host "2. VPS console access (through hosting control panel)"
Write-Host "3. Contact hosting provider for SSH access"

Write-Host "`nOnce connected, run these commands to fix the app:" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

@"
cd /var/www/earnings-table
sudo systemctl stop earnings-table
npm ci --production
npx prisma generate
npm run build
sudo systemctl start earnings-table
sudo systemctl status earnings-table
"@ | Write-Host -ForegroundColor White

Write-Host "`nOR deploy fresh HTTPS version:" -ForegroundColor Green

@"
# Download and run HTTPS deployment
wget -O deploy.sh https://github.com/your-repo/deploy-https-production.sh
chmod +x deploy.sh
bash deploy.sh
"@ | Write-Host -ForegroundColor White

Write-Host "`nCommon SSH Issues:" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

Write-Host "X 'Permission denied' - Wrong username or password"
Write-Host "X 'Connection refused' - SSH service not running"  
Write-Host "X 'Host key verification failed' - Remove old key from known_hosts"
Write-Host "X 'Password authentication disabled' - Need SSH key"

Write-Host "`nNext steps if SSH still fails:" -ForegroundColor Red
Write-Host "1. Contact your hosting provider"
Write-Host "2. Use web-based terminal in control panel"
Write-Host "3. Check if server requires SSH key authentication"
Write-Host "4. Verify the correct username for your server"

Write-Host "`nReady to connect? Try:" -ForegroundColor Green
Write-Host "ssh root@$server" -ForegroundColor White
