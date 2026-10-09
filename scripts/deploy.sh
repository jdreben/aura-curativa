#!/usr/bin/env bash
# Builds and ships the static site to the EC2 box. Usage: scripts/deploy.sh [--setup]
set -euo pipefail
IP="${HA_IP:-18.212.154.202}"
HOST="${IP//./-}.sslip.io"
KEY="${HA_KEY:-$HOME/.ssh/healing-aura.pem}"
SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5 "ec2-user@$IP")

npm run build >/dev/null
rsync -az --delete -e "ssh -i $KEY -o StrictHostKeyChecking=accept-new" build/ "ec2-user@$IP:/srv/healing-aura/"

if [[ "${1:-}" == "--setup" ]]; then
	"${SSH[@]}" "sudo tee /etc/caddy/Caddyfile >/dev/null" <<EOF
$HOST {
	root * /srv/healing-aura
	try_files {path} {path}.html {path}/ /index.html
	file_server
	encode gzip
	header Referrer-Policy no-referrer
}
http://$IP {
	redir https://$HOST{uri}
}
EOF
	"${SSH[@]}" "sudo tee /etc/systemd/system/caddy.service >/dev/null" <<'EOF'
[Unit]
Description=Caddy
After=network-online.target
Wants=network-online.target
[Service]
ExecStart=/usr/local/bin/caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
Environment=XDG_DATA_HOME=/var/lib XDG_CONFIG_HOME=/etc
Restart=on-failure
AmbientCapabilities=CAP_NET_BIND_SERVICE
[Install]
WantedBy=multi-user.target
EOF
	"${SSH[@]}" 'sudo systemctl daemon-reload && sudo systemctl enable --now caddy && sudo systemctl restart caddy'
fi
echo "https://$HOST"
