#!/bin/bash

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Python and dependencies
sudo apt-get install -y python3-pip python3-venv nginx

# Create project directory
mkdir -p ~/videolang
cd ~/videolang

# Set up virtual environment
python3 -m venv venv
source venv/bin/activate

# Clone your repository
git clone https://github.com/your-username/videolang.git
cd videolang_backend

# Install requirements
pip install -r requirements.txt

# Set up Gunicorn service
sudo bash -c 'cat > /etc/systemd/system/videolang.service << EOL
[Unit]
Description=VideoLang Django Application
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/videolang/videolang_backend
Environment="PATH=/home/ubuntu/videolang/venv/bin"
ExecStart=/home/ubuntu/videolang/venv/bin/gunicorn --workers 3 --bind unix:/tmp/videolang.sock videolang_backend.wsgi:application

[Install]
WantedBy=multi-user.target
EOL'

# Set up Nginx
sudo bash -c 'cat > /etc/nginx/sites-available/videolang << EOL
server {
    listen 80;
    server_name your_domain_or_ip;

    location / {
        proxy_pass http://unix:/tmp/videolang.sock;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOL'

# Enable the site
sudo ln -s /etc/nginx/sites-available/videolang /etc/nginx/sites-enabled/
sudo systemctl restart nginx
sudo systemctl start videolang
sudo systemctl enable videolang 