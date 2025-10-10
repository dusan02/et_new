#!/bin/bash

# 🖥️ VNC SERVER SETUP SCRIPT
# Nastavenie VNC servera pre Ubuntu server

set -e  # Exit on any error

echo "🖥️ Starting VNC server setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VNC_USER="root"
VNC_DISPLAY=":1"
VNC_RESOLUTION="1920x1080"
VNC_DEPTH="24"

echo -e "${BLUE}📋 VNC Configuration:${NC}"
echo "VNC User: $VNC_USER"
echo "VNC Display: $VNC_DISPLAY"
echo "Resolution: $VNC_RESOLUTION"
echo "Color Depth: $VNC_DEPTH"
echo ""

# Step 1: Update system
echo -e "${YELLOW}📦 Step 1: Updating system packages...${NC}"
apt-get update -y
apt-get upgrade -y

# Step 2: Install desktop environment
echo -e "${YELLOW}🖥️ Step 2: Installing desktop environment...${NC}"
apt-get install -y ubuntu-desktop-minimal
apt-get install -y xfce4 xfce4-goodies

# Step 3: Install VNC server
echo -e "${YELLOW}🔧 Step 3: Installing VNC server...${NC}"
apt-get install -y tightvncserver
apt-get install -y xfce4-session

# Step 4: Create VNC user directory
echo -e "${YELLOW}📁 Step 4: Setting up VNC directories...${NC}"
mkdir -p /home/$VNC_USER/.vnc
chown -R $VNC_USER:$VNC_USER /home/$VNC_USER/.vnc

# Step 5: Set VNC password
echo -e "${YELLOW}🔐 Step 5: Setting VNC password...${NC}"
echo "Please set a VNC password (minimum 6 characters):"
su - $VNC_USER -c "vncpasswd"

# Step 6: Create VNC startup script
echo -e "${YELLOW}📝 Step 6: Creating VNC startup script...${NC}"
cat > /home/$VNC_USER/.vnc/xstartup << 'EOF'
#!/bin/bash
xrdb $HOME/.Xresources
startxfce4 &
EOF

chmod +x /home/$VNC_USER/.vnc/xstartup
chown $VNC_USER:$VNC_USER /home/$VNC_USER/.vnc/xstartup

# Step 7: Create VNC service
echo -e "${YELLOW}⚙️ Step 7: Creating VNC systemd service...${NC}"
cat > /etc/systemd/system/vncserver@.service << EOF
[Unit]
Description=Start TightVNC server at startup
After=syslog.target network.target

[Service]
Type=forking
User=$VNC_USER
Group=$VNC_USER
WorkingDirectory=/home/$VNC_USER

PIDFile=/home/$VNC_USER/.vnc/%H%i.pid
ExecStartPre=-/usr/bin/vncserver -kill :%i > /dev/null 2>&1
ExecStart=/usr/bin/vncserver -depth $VNC_DEPTH -geometry $VNC_RESOLUTION :%i
ExecStop=/usr/bin/vncserver -kill :%i

[Install]
WantedBy=multi-user.target
EOF

# Step 8: Enable and start VNC service
echo -e "${YELLOW}🚀 Step 8: Starting VNC service...${NC}"
systemctl daemon-reload
systemctl enable vncserver@1.service
systemctl start vncserver@1.service

# Step 9: Configure firewall
echo -e "${YELLOW}🔥 Step 9: Configuring firewall...${NC}"
ufw allow 5901/tcp
ufw allow 5900:5910/tcp

# Step 10: Install additional useful packages
echo -e "${YELLOW}📦 Step 10: Installing additional packages...${NC}"
apt-get install -y firefox
apt-get install -y gedit
apt-get install -y file-manager
apt-get install -y terminal

# Step 11: Create VNC connection info file
echo -e "${YELLOW}📋 Step 11: Creating connection information...${NC}"
cat > /home/$VNC_USER/vnc-connection-info.txt << EOF
🖥️ VNC Server Connection Information
=====================================

Server IP: $(curl -s ifconfig.me)
VNC Port: 5901
Display: :1
Resolution: $VNC_RESOLUTION
Desktop: XFCE4

Connection Details:
- Use VNC Viewer or any VNC client
- Connect to: $(curl -s ifconfig.me):5901
- Password: [The password you set during setup]

Alternative connection methods:
- SSH tunnel: ssh -L 5901:localhost:5901 $VNC_USER@$(curl -s ifconfig.me)
- Then connect to: localhost:5901

Useful commands:
- Start VNC: systemctl start vncserver@1
- Stop VNC: systemctl stop vncserver@1
- Restart VNC: systemctl restart vncserver@1
- Check status: systemctl status vncserver@1
- View logs: journalctl -u vncserver@1 -f

Security Notes:
- VNC password is stored in /home/$VNC_USER/.vnc/passwd
- Consider using SSH tunnel for additional security
- Firewall allows ports 5900-5910
EOF

chown $VNC_USER:$VNC_USER /home/$VNC_USER/vnc-connection-info.txt

# Step 12: Final status check
echo -e "${YELLOW}✅ Step 12: Checking VNC status...${NC}"
sleep 3
systemctl status vncserver@1.service --no-pager

echo ""
echo -e "${GREEN}🎉 VNC server setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Connection Information:${NC}"
echo "Server IP: $(curl -s ifconfig.me)"
echo "VNC Port: 5901"
echo "Display: :1"
echo ""
echo -e "${YELLOW}📖 Next steps:${NC}"
echo "1. Download VNC Viewer from: https://www.realvnc.com/download/viewer/"
echo "2. Connect to: $(curl -s ifconfig.me):5901"
echo "3. Use the password you set during installation"
echo ""
echo -e "${BLUE}📄 Connection details saved to: /home/$VNC_USER/vnc-connection-info.txt${NC}"
echo ""
echo -e "${GREEN}✅ VNC server is ready for remote desktop connections!${NC}"
