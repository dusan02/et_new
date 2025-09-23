# GitHub Actions SSH Fix

## Problem

```
ssh: handshake failed: ssh: unable to authenticate, attempted methods [none publickey], no supported methods remain
```

## Solution

### 1. Check GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Make sure these secrets are set:

- `HOST`: `89.185.250.213`
- `USERNAME`: `root`
- `SSH_KEY`: Your private SSH key

### 2. Generate SSH Key (if needed)

```bash
# On your local machine
ssh-keygen -t rsa -b 4096 -C "github-actions@earningstable.com"
# Save as: ~/.ssh/github_actions_key

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_actions_key.pub root@89.185.250.213

# Copy private key content to GitHub Secrets
cat ~/.ssh/github_actions_key
```

### 3. Alternative: Use Password Authentication

Update `.github/workflows/deploy.yml`:

```yaml
- name: Deploy to server
  uses: appleboy/ssh-action@v1.1.0
  with:
    host: ${{ secrets.HOST }}
    username: ${{ secrets.USERNAME }}
    password: ${{ secrets.PASSWORD }} # Instead of key
    port: 22
    timeout: 60s
    command_timeout: 15m
    script: |
      cd /var/www/earnings-table
      git pull origin main
      npm install
      npm run build
      pkill -f "node.*next" || true
      nohup npm start > app.log 2>&1 &
      echo "Deployment completed"
```

### 4. Quick Fix - Manual Deploy

Since the code is already on GitHub, you can manually deploy:

```bash
ssh root@89.185.250.213
cd /var/www/earnings-table
git pull origin main
npm install
npm run build
pkill -f "node.*next" || true
nohup npm start > app.log 2>&1 &
```

## Status

✅ Code pushed to GitHub
✅ Manual deployment working
❌ GitHub Actions SSH authentication needs fixing
