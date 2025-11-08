# SSL/TLS Certificate Setup Guide

## 🔒 Production SSL Certificate Setup

### Option 1: Let's Encrypt (Free - Recommended for most deployments)

#### Using Certbot (Automated)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificate (standalone mode)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be saved to:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

#### Auto-renewal Setup

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab for auto-renewal
sudo crontab -e

# Add this line (runs twice daily)
0 0,12 * * * certbot renew --quiet --post-hook "systemctl restart your-app-service"
```

### Option 2: Commercial SSL Certificate (e.g., DigiCert, Sectigo)

1. Purchase certificate from provider
2. Generate CSR (Certificate Signing Request)
3. Submit CSR to provider
4. Download certificate files
5. Install on server

### Option 3: Cloudflare (Free SSL + CDN)

1. Sign up at cloudflare.com
2. Add your domain
3. Update DNS nameservers
4. Enable SSL/TLS (Flexible or Full)
5. Cloudflare handles SSL termination

---

## 🚀 Node.js HTTPS Server Setup

### Method 1: HTTPS in Node.js Directly

Update `server/src/server.js`:

```javascript
import https from 'https'
import fs from 'fs'
import path from 'path'

// Load SSL certificates
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, '../ssl/private.key')),
  cert: fs.readFileSync(path.join(__dirname, '../ssl/certificate.crt')),
  ca: fs.readFileSync(path.join(__dirname, '../ssl/ca_bundle.crt')) // Optional
}

// Create HTTPS server
const httpsServer = https.createServer(httpsOptions, app)

httpsServer.listen(config.port, () => {
  logger.info(`🔒 HTTPS Server running on port ${config.port}`)
})
```

### Method 2: Reverse Proxy with Nginx (Recommended)

#### Install Nginx

```bash
sudo apt-get update
sudo apt-get install nginx
```

#### Nginx Configuration

Create `/etc/nginx/sites-available/hostel-management`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificate
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration (Mozilla Intermediate)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

    # Root directory for static files
    root /var/www/hostel-management/client/dist;
    index index.html;

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files for uploads
    location /uploads/ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Frontend SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # File upload size limit
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/hostel-management-access.log;
    error_log /var/log/nginx/hostel-management-error.log;
}
```

#### Enable Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/hostel-management /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Method 3: Apache Reverse Proxy

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem
    
    ProxyPreserveHost On
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api
    
    DocumentRoot /var/www/hostel-management/client/dist
    <Directory /var/www/hostel-management/client/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

---

## 📋 SSL Testing & Verification

### Test SSL Configuration

```bash
# Using OpenSSL
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate expiry
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Online tools
# https://www.ssllabs.com/ssltest/
# https://www.sslshopper.com/ssl-checker.html
```

### Expected SSL Grade: A or A+

---

## 🔐 Additional Security Configurations

### Update server security headers

Already implemented in `server/src/config/security.js`:
- ✅ Helmet security headers
- ✅ CORS configuration
- ✅ HSTS (Strict-Transport-Security)
- ✅ CSP (Content Security Policy)
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options

### Environment-specific SSL

Update `server/src/config/config.js`:

```javascript
export const sslConfig = {
  enabled: config.nodeEnv === 'production',
  certPath: process.env.SSL_CERT_PATH,
  keyPath: process.env.SSL_KEY_PATH,
  caPath: process.env.SSL_CA_PATH
}
```

---

## 🌍 Deployment Platform SSL

### Heroku
- ✅ Automatic SSL (free)
- Configure custom domain in Heroku dashboard
- SSL certificate auto-managed

### AWS (Elastic Beanstalk / EC2)
- Use AWS Certificate Manager (ACM)
- Attach certificate to Load Balancer
- Configure HTTPS listener

### DigitalOcean
- Use DigitalOcean Load Balancer with Let's Encrypt
- Or configure directly on droplet

### Vercel/Netlify
- ✅ Automatic SSL (free)
- Configure custom domain
- SSL auto-managed

---

## ✅ SSL Checklist

- [ ] Obtain SSL certificate (Let's Encrypt recommended)
- [ ] Configure reverse proxy (Nginx/Apache) or HTTPS in Node.js
- [ ] Set up auto-renewal for Let's Encrypt
- [ ] Test SSL configuration (SSLLabs.com)
- [ ] Enable HSTS header
- [ ] Redirect HTTP to HTTPS
- [ ] Update CORS_ORIGIN in .env to https://
- [ ] Test on production domain
- [ ] Monitor certificate expiry
- [ ] Set up alerts for certificate renewal failures

---

## 📚 Resources

- Let's Encrypt: https://letsencrypt.org/
- Certbot: https://certbot.eff.org/
- SSL Labs Test: https://www.ssllabs.com/ssltest/
- Mozilla SSL Config Generator: https://ssl-config.mozilla.org/
