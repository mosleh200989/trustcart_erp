# Launching handsomemanbd.com

Step-by-step runbook to take the Handsome Man storefront live.
VPS: `ssh samin@72.62.244.67` (frontend :3000, backend :3001 via pm2, nginx in front).

## 1. Namecheap DNS

Dashboard → Domain List → **handsomemanbd.com** → **Manage** → **Advanced DNS**:

| Type | Host | Value | TTL |
|---|---|---|---|
| A Record | `@` | `72.62.244.67` | Automatic |
| A Record | `www` | `72.62.244.67` | Automatic |

Delete any default records Namecheap added (parking CNAME on `www`, URL redirect record on `@`).
Propagation is usually minutes; verify with: `nslookup handsomemanbd.com`.

## 2. Deploy the code (on the VPS)

```bash
cd /path/to/trustcart_erp
git pull                                  # after the branch is merged
psql -U postgres -d trustcart_erp -f db/migrations/2026-08-22-create-storefronts.sql
cd backend  && npm run build
cd ../frontend && npm run build
pm2 restart nest-backend
pm2 restart <frontend-pm2-name>
```

## 3. nginx + SSL (on the VPS)

```bash
# HTTP-only bootstrap so certbot can validate (cert paths don't exist yet)
sudo tee /etc/nginx/sites-available/handsomemanbd.conf > /dev/null <<'EOF'
server {
    listen 80;
    server_name handsomemanbd.com www.handsomemanbd.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/handsomemanbd.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Issue certificate (certbot rewrites the config for SSL + redirect)
sudo certbot --nginx -d handsomemanbd.com -d www.handsomemanbd.com

# Then replace with the full config from the repo if preferred:
#   nginx/handsomemanbd.conf  (already contains the SSL server block)
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Configure the storefront (admin panel)

`/admin/storefronts` → Handsome Man:

1. **Settings**: contact phone/email, logo URL, Meta **Pixel ID** + **CAPI access token**, delivery charges.
2. **Categories**: seeded — Grooming, Fragrance, Style & Wear, Accessories, Fitness. Rename/add as needed.
3. **Products**: search inventory, add products, assign category, star the homepage features.

## 5. Verify

- `https://handsomemanbd.com` → dark Handsome Man homepage (never TrustCart).
- Place a small test order → appears in `/admin/sales` with source `handsomeman`.
- Meta Events Manager → Test events (use the test event code field) → PageView/ViewContent/Purchase.

## Rollback

The storefront is additive. To take it offline: toggle **Inactive** in `/admin/storefronts`
(public API 404s, site shows not-found) or remove the nginx site and reload.
