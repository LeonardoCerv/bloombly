#!/bin/bash
# VPS Setup Script for Ubuntu 20.04+

echo "🌸 Setting up Bloombly on VPS..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3 python3-pip nodejs npm git nginx

# Install Docker (optional)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone your repo (replace with your GitHub URL)
cd /opt
sudo git clone https://github.com/LeonardoCerv/bloombly.git
sudo chown -R $USER:$USER bloombly
cd bloombly

# Setup environment
cp .env.example .env
echo "Edit .env file with your credentials:"
echo "nano .env"

# Install Python dependencies
cd api
pip3 install -r requirements.txt

# Install Node dependencies
cd ../frontend
npm install

# Setup systemd services
sudo tee /etc/systemd/system/bloombly-api.service > /dev/null <<EOF
[Unit]
Description=Bloombly API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/bloombly/api
Environment=PATH=/usr/bin:/usr/local/bin
ExecStart=/usr/bin/python3 app/main.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/bloombly-frontend.service > /dev/null <<EOF
[Unit]
Description=Bloombly Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/bloombly/frontend
Environment=PATH=/usr/bin:/usr/local/bin
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Setup Nginx reverse proxy
sudo tee /etc/nginx/sites-available/bloombly > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Data files
    location /data/ {
        proxy_pass http://localhost:3000;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/bloombly /etc/nginx/sites-enabled/
sudo nginx -t

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit /opt/bloombly/.env with your credentials"
echo "2. Replace 'your-domain.com' in nginx config"
echo "3. Start services:"
echo "   sudo systemctl enable --now bloombly-api"
echo "   sudo systemctl enable --now bloombly-frontend" 
echo "   sudo systemctl enable --now nginx"
echo "4. Optional: Setup SSL with certbot"
echo ""
echo "Check status: sudo systemctl status bloombly-api bloombly-frontend"