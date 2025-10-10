#!/bin/bash

# 🔒 VNC SECURITY CONFIGURATION SCRIPT
# Rozšírené bezpečnostné nastavenia pre VNC server

set -e

echo "🔒 Configuring VNC security settings..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VNC_USER="root"
VNC_DISPLAY=":1"

# Step 1: Configure VNC server options
echo -e "${YELLOW}🔧 Step 1: Configuring VNC server options...${NC}"
cat > /home/$VNC_USER/.vnc/config << 'EOF'
# VNC Server Configuration
# Security and performance settings

# Disable unused authentication methods
SecurityTypes=VncAuth

# Set session timeout (in seconds)
SessionTimeout=3600

# Disable clipboard
DisableClipboard=1

# Disable file transfer
DisableFileTransfer=1

# Set maximum connection attempts
MaxConnectionAttempts=3

# Disable desktop sharing
DisableDesktopSharing=1

# Set idle timeout
IdleTimeout=1800

# Disable remote control
DisableRemoteControl=1
EOF

chown $VNC_USER:$VNC_USER /home/$VNC_USER/.vnc/config

# Step 2: Create SSH tunnel script
echo -e "${YELLOW}🔐 Step 2: Creating SSH tunnel script...${NC}"
cat > /home/$VNC_USER/vnc-ssh-tunnel.sh << 'EOF'
#!/bin/bash
# SSH Tunnel for VNC (Secure Connection)

echo "🔐 Creating SSH tunnel for VNC..."
echo "This will create a secure tunnel to your VNC server"
echo ""

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)
echo "Server IP: $SERVER_IP"
echo ""

echo "Run this command on your local machine:"
echo "ssh -L 5901:localhost:5901 root@$SERVER_IP"
echo ""
echo "Then connect VNC client to: localhost:5901"
echo ""
echo "To keep tunnel alive, add -N flag:"
echo "ssh -L 5901:localhost:5901 -N root@$SERVER_IP"
EOF

chmod +x /home/$VNC_USER/vnc-ssh-tunnel.sh
chown $VNC_USER:$VNC_USER /home/$VNC_USER/vnc-ssh-tunnel.sh

# Step 3: Configure firewall rules
echo -e "${YELLOW}🔥 Step 3: Configuring advanced firewall rules...${NC}"

# Remove default VNC port from public access
ufw delete allow 5901/tcp 2>/dev/null || true

# Allow VNC only from specific IPs (optional)
# ufw allow from YOUR_IP_ADDRESS to any port 5901

# Allow SSH (keep this!)
ufw allow ssh

# Enable firewall
ufw --force enable

# Step 4: Create VNC access control
echo -e "${YELLOW}🛡️ Step 4: Creating VNC access control...${NC}"
cat > /home/$VNC_USER/.vnc/hosts.allow << 'EOF'
# VNC Access Control
# Allow connections only from specific IPs
# Format: IP_ADDRESS or IP_RANGE

# Example:
# 192.168.1.0/24
# 10.0.0.0/8
# YOUR_IP_ADDRESS

# For now, allow all (change this for production!)
ALL
EOF

cat > /home/$VNC_USER/.vnc/hosts.deny << 'EOF'
# VNC Access Deny
# Block specific IPs or ranges
# Format: IP_ADDRESS or IP_RANGE

# Example:
# 192.168.1.100
# 10.0.0.0/8
EOF

chown $VNC_USER:$VNC_USER /home/$VNC_USER/.vnc/hosts.allow
chown $VNC_USER:$VNC_USER /home/$VNC_USER/.vnc/hosts.deny

# Step 5: Create VNC monitoring script
echo -e "${YELLOW}📊 Step 5: Creating VNC monitoring script...${NC}"
cat > /home/$VNC_USER/vnc-monitor.sh << 'EOF'
#!/bin/bash
# VNC Server Monitoring Script

echo "📊 VNC Server Status Monitor"
echo "============================"
echo ""

# Check VNC service status
echo "🔍 VNC Service Status:"
systemctl status vncserver@1.service --no-pager -l
echo ""

# Check VNC processes
echo "🔍 VNC Processes:"
ps aux | grep vnc
echo ""

# Check VNC connections
echo "🔍 Active VNC Connections:"
netstat -tulpn | grep :5901
echo ""

# Check VNC logs
echo "🔍 Recent VNC Logs:"
journalctl -u vncserver@1.service --no-pager -n 10
echo ""

# Check system resources
echo "🔍 System Resources:"
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)"
echo ""
echo "Memory Usage:"
free -h
echo ""
echo "Disk Usage:"
df -h /
echo ""

# Check firewall status
echo "🔍 Firewall Status:"
ufw status
echo ""

echo "✅ VNC monitoring completed!"
EOF

chmod +x /home/$VNC_USER/vnc-monitor.sh
chown $VNC_USER:$VNC_USER /home/$VNC_USER/vnc-monitor.sh

# Step 6: Create VNC backup script
echo -e "${YELLOW}💾 Step 6: Creating VNC backup script...${NC}"
cat > /home/$VNC_USER/vnc-backup.sh << 'EOF'
#!/bin/bash
# VNC Configuration Backup Script

BACKUP_DIR="/home/root/vnc-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "💾 Backing up VNC configuration to: $BACKUP_DIR"

# Backup VNC configuration
cp -r /home/root/.vnc "$BACKUP_DIR/"
cp /etc/systemd/system/vncserver@.service "$BACKUP_DIR/"

# Backup connection info
cp /home/root/vnc-connection-info.txt "$BACKUP_DIR/" 2>/dev/null || true

# Create backup info
cat > "$BACKUP_DIR/backup-info.txt" << 'INFO'
VNC Configuration Backup
========================
Date: $(date)
Server: $(hostname)
IP: $(curl -s ifconfig.me)

Contents:
- .vnc/ directory (VNC configuration and password)
- vncserver@.service (systemd service file)
- vnc-connection-info.txt (connection details)

To restore:
1. Stop VNC service: systemctl stop vncserver@1
2. Copy files back to original locations
3. Set correct permissions: chown -R root:root /home/root/.vnc
4. Restart VNC service: systemctl start vncserver@1
INFO

echo "✅ VNC backup completed: $BACKUP_DIR"
echo "📁 Backup contents:"
ls -la "$BACKUP_DIR"
EOF

chmod +x /home/$VNC_USER/vnc-backup.sh
chown $VNC_USER:$VNC_USER /home/$VNC_USER/vnc-backup.sh

# Step 7: Create VNC restart script
echo -e "${YELLOW}🔄 Step 7: Creating VNC restart script...${NC}"
cat > /home/$VNC_USER/vnc-restart.sh << 'EOF'
#!/bin/bash
# VNC Server Restart Script

echo "🔄 Restarting VNC server..."

# Stop VNC service
echo "⏹️ Stopping VNC service..."
systemctl stop vncserver@1.service

# Wait a moment
sleep 2

# Kill any remaining VNC processes
echo "🧹 Cleaning up VNC processes..."
pkill -f vnc || true

# Wait a moment
sleep 2

# Start VNC service
echo "▶️ Starting VNC service..."
systemctl start vncserver@1.service

# Wait for service to start
sleep 3

# Check status
echo "📊 VNC service status:"
systemctl status vncserver@1.service --no-pager

echo "✅ VNC server restart completed!"
EOF

chmod +x /home/$VNC_USER/vnc-restart.sh
chown $VNC_USER:$VNC_USER /home/$VNC_USER/vnc-restart.sh

# Step 8: Update connection info with security notes
echo -e "${YELLOW}📋 Step 8: Updating connection information...${NC}"
cat >> /home/$VNC_USER/vnc-connection-info.txt << 'EOF'

🔒 SECURITY CONFIGURATION
=========================

Security Features Enabled:
- VNC password authentication
- Session timeout (1 hour)
- Idle timeout (30 minutes)
- Disabled clipboard sharing
- Disabled file transfer
- Disabled desktop sharing
- Disabled remote control
- Firewall configured (VNC port not publicly accessible)

Recommended Connection Methods:
1. SSH Tunnel (Most Secure):
   ssh -L 5901:localhost:5901 root@SERVER_IP
   Then connect to: localhost:5901

2. VPN Connection (Secure):
   Connect to VPN first, then use VNC directly

3. Direct Connection (Less Secure):
   Only use on trusted networks
   Connect to: SERVER_IP:5901

Security Scripts Available:
- ./vnc-monitor.sh - Monitor VNC status
- ./vnc-backup.sh - Backup VNC configuration
- ./vnc-restart.sh - Restart VNC service
- ./vnc-ssh-tunnel.sh - Show SSH tunnel commands

Important Security Notes:
- Change VNC password regularly
- Use SSH tunnel for remote access
- Monitor VNC connections
- Keep system updated
- Consider IP whitelisting in hosts.allow
EOF

echo ""
echo -e "${GREEN}🔒 VNC security configuration completed!${NC}"
echo ""
echo -e "${BLUE}📋 Security Features Enabled:${NC}"
echo "✅ VNC password authentication"
echo "✅ Session and idle timeouts"
echo "✅ Disabled clipboard and file transfer"
echo "✅ Firewall configured (VNC not publicly accessible)"
echo "✅ Access control files created"
echo "✅ Monitoring and backup scripts"
echo ""
echo -e "${YELLOW}🔐 Recommended Connection Method:${NC}"
echo "Use SSH tunnel for secure access:"
echo "ssh -L 5901:localhost:5901 root@$(curl -s ifconfig.me)"
echo "Then connect VNC client to: localhost:5901"
echo ""
echo -e "${GREEN}✅ VNC server is now securely configured!${NC}"
