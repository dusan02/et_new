#!/bin/bash

# 🚀 QUICK VNC SETUP - Rýchle nastavenie VNC servera
# Pre riešenie SSH problémov

set -e

echo "🚀 Quick VNC Setup - Riešenie SSH problémov"
echo "============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "UNKNOWN")

echo -e "${BLUE}📋 Server Information:${NC}"
echo "Server IP: $SERVER_IP"
echo "User: $(whoami)"
echo "OS: $(lsb_release -d | cut -f2)"
echo ""

# Step 1: Install required packages
echo -e "${YELLOW}📦 Step 1: Installing packages...${NC}"
apt-get update -y
apt-get install -y ubuntu-desktop-minimal xfce4 xfce4-goodies tightvncserver firefox

# Step 2: Setup VNC
echo -e "${YELLOW}🔧 Step 2: Setting up VNC...${NC}"
mkdir -p ~/.vnc

# Create xstartup
cat > ~/.vnc/xstartup << 'EOF'
#!/bin/bash
xrdb $HOME/.Xresources
startxfce4 &
EOF

chmod +x ~/.vnc/xstartup

# Step 3: Set VNC password
echo -e "${YELLOW}🔐 Step 3: Setting VNC password...${NC}"
echo "Please set a VNC password (minimum 6 characters):"
vncpasswd

# Step 4: Start VNC server
echo -e "${YELLOW}🚀 Step 4: Starting VNC server...${NC}"
vncserver :1 -geometry 1920x1080 -depth 24

# Step 5: Configure firewall
echo -e "${YELLOW}🔥 Step 5: Configuring firewall...${NC}"
ufw allow 5901/tcp
ufw --force enable

# Step 6: Create connection info
echo -e "${YELLOW}📋 Step 6: Creating connection information...${NC}"
cat > ~/vnc-info.txt << EOF
🖥️ VNC Server Ready!
====================

Server IP: $SERVER_IP
VNC Port: 5901
Display: :1
Resolution: 1920x1080
Desktop: XFCE4

🔌 How to connect:
1. Download VNC Viewer: https://www.realvnc.com/download/viewer/
2. Install VNC Viewer
3. Open VNC Viewer
4. Connect to: $SERVER_IP:5901
5. Enter the password you just set

🛠️ Useful commands:
- Start VNC: vncserver :1
- Stop VNC: vncserver -kill :1
- Check status: ps aux | grep vnc
- View connections: netstat -tulpn | grep :5901

🔒 Security note:
VNC is now accessible from the internet on port 5901.
For better security, consider using SSH tunnel:
ssh -L 5901:localhost:5901 $(whoami)@$SERVER_IP
Then connect to: localhost:5901

✅ VNC server is running and ready for connections!
EOF

# Step 7: Show final information
echo ""
echo -e "${GREEN}🎉 VNC server setup completed!${NC}"
echo ""
echo -e "${BLUE}📋 Connection Information:${NC}"
echo "Server IP: $SERVER_IP"
echo "VNC Port: 5901"
echo "Display: :1"
echo ""
echo -e "${YELLOW}🔌 To connect:${NC}"
echo "1. Download VNC Viewer from: https://www.realvnc.com/download/viewer/"
echo "2. Connect to: $SERVER_IP:5901"
echo "3. Use the password you just set"
echo ""
echo -e "${BLUE}📄 Connection details saved to: ~/vnc-info.txt${NC}"
echo ""
echo -e "${GREEN}✅ You can now connect to your server graphically!${NC}"
echo -e "${GREEN}✅ No more SSH terminal problems!${NC}"
