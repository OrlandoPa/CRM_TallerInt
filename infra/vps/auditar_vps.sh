#!/usr/bin/env bash
# Auditoría de endurecimiento de un VPS del SGRC (Anexo F, Parte 9: BE-17, RNF-SEG-09).
# Solo LEE la configuración: no cambia nada. Ejecutar como root:
#   bash auditar_vps.sh | tee auditoria_$(hostname -s)_$(date +%F).txt
# Termina con el número de controles en FALLA (0 = todo bien).
set -uo pipefail

fallas=0
ok()    { printf '  [OK]    %s\n' "$*"; }
falla() { printf '  [FALLA] %s\n' "$*"; fallas=$((fallas + 1)); }
aviso() { printf '  [AVISO] %s\n' "$*"; }
titulo(){ printf '\n== %s\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "Ejecuta como root (sudo)."; exit 2; }
echo "Auditoría de $(hostname -f 2>/dev/null || hostname) - $(date -u '+%F %T UTC')"
. /etc/os-release 2>/dev/null && echo "Sistema: ${PRETTY_NAME:-?}  Kernel: $(uname -r)"

titulo "1. SSH (configuración efectiva: sshd -T)"
if command -v sshd >/dev/null; then
  cfg="$(sshd -T 2>/dev/null)"
  val() { awk -v k="$1" '$1 == k {print $2; exit}' <<<"$cfg"; }
  [ "$(val passwordauthentication)" = "no" ] && ok "Sin contraseñas (PasswordAuthentication no)" \
    || falla "PasswordAuthentication = $(val passwordauthentication) (en /etc/ssh/sshd_config.d/ gana el primer archivo en orden alfabético)"
  [ "$(val kbdinteractiveauthentication)" = "no" ] && ok "KbdInteractiveAuthentication no" || falla "KbdInteractiveAuthentication = $(val kbdinteractiveauthentication)"
  [ "$(val permitrootlogin)" = "no" ] && ok "Sin acceso remoto de root (PermitRootLogin no)" || falla "PermitRootLogin = $(val permitrootlogin)"
  [ "$(val pubkeyauthentication)" = "yes" ] && ok "Acceso con llave (PubkeyAuthentication yes)" || falla "PubkeyAuthentication = $(val pubkeyauthentication)"
  [ "$(val maxauthtries)" -le 4 ] 2>/dev/null && ok "MaxAuthTries $(val maxauthtries)" || aviso "MaxAuthTries = $(val maxauthtries) (recomendado 3)"
  usuarios_llave=$(for d in /root /home/*; do [ -s "$d/.ssh/authorized_keys" ] && echo "$(basename "$d")"; done | tr '\n' ' ')
  [ -n "$usuarios_llave" ] && ok "Usuarios con llaves autorizadas: $usuarios_llave" || falla "Ningún usuario tiene llaves en authorized_keys"
else
  falla "sshd no encontrado"
fi

titulo "2. Firewall (ufw)"
if command -v ufw >/dev/null; then
  estado="$(ufw status verbose 2>/dev/null)"
  activo=0
  grep -q "Status: active" <<<"$estado" && activo=1
  [ "$activo" = 1 ] && ok "ufw activo" || falla "ufw inactivo"
  grep -q "deny (incoming)" <<<"$estado" && ok "Entrante denegado por defecto" || falla "La política de entrada no es deny"
  permitidos="$(awk '/ALLOW/ {print $1}' <<<"$estado" | sort -u | tr '\n' ' ')"
  extra="$(tr ' ' '\n' <<<"$permitidos" | grep -vE '^(22|80|443)(/tcp)?$|^(22|80|443)/tcp\(v6\)$|^$' | grep -vE '^(22|80|443)(/tcp)? *\(v6\)$' || true)"
  if [ "$activo" = 0 ]; then
    aviso "Reglas no evaluadas: ufw está inactivo"
  elif [ -z "$extra" ]; then
    ok "Solo se permiten 22, 80 y 443 (${permitidos:-solo LIMIT 22})"
  else
    falla "Reglas de entrada adicionales: $(tr '\n' ' ' <<<"$extra")"
  fi
else
  falla "ufw no instalado"
fi

titulo "3. Puertos escuchando en todas las interfaces"
expuestos="$(ss -H -tlnp 2>/dev/null | awk '$4 ~ /^(0\.0\.0\.0|\*|\[::\]):/ {split($4,a,":"); p=a[length(a)]; print p" "$6}' | grep -vE '^(22|80|443) ' | sort -u || true)"
[ -z "$expuestos" ] && ok "Solo 22, 80 y 443 escuchan hacia afuera" || { falla "Puertos expuestos además de 22/80/443:"; sed 's/^/          /' <<<"$expuestos"; }

titulo "4. Docker"
if command -v docker >/dev/null; then
  publicados="$(docker ps --format '{{.Names}} {{.Ports}}' | tr ',' '\n' | grep -E '(0\.0\.0\.0|\[::\]|:::)[0-9]*:[0-9]+->' | grep -vE ':(80|443)->' || true)"
  [ -z "$publicados" ] && ok "Ningún contenedor publica puertos internos hacia internet" \
    || { falla "Puertos de contenedores publicados en todas las interfaces (Docker se salta ufw):"; sed 's/^/          /' <<<"$publicados"; }
  priv="$(docker ps -q | xargs -r docker inspect --format '{{.Name}} {{.HostConfig.Privileged}}' | awk '$2 == "true" {print $1}')"
  [ -z "$priv" ] && ok "Ningún contenedor privilegiado" || falla "Contenedores privilegiados: $priv"
  sock="$(docker ps -q | xargs -r docker inspect --format '{{.Name}} {{range .Mounts}}{{if eq .Source "/var/run/docker.sock"}}{{.RW}}{{end}}{{end}}' | awk 'NF == 2')"
  [ -z "$sock" ] && ok "Ningún contenedor monta docker.sock" \
    || while read -r n rw; do [ "$rw" = "false" ] && aviso "$n monta docker.sock en solo lectura (normal en Traefik)" || falla "$n monta docker.sock con escritura"; done <<<"$sock"
  echo "  Imágenes en uso:"; docker ps --format '          {{.Names}}: {{.Image}} (creado {{.RunningFor}})'
else
  aviso "Docker no instalado"
fi

titulo "5. Actualizaciones"
if dpkg -s unattended-upgrades >/dev/null 2>&1; then
  grep -qs 'Unattended-Upgrade "1"' /etc/apt/apt.conf.d/20auto-upgrades && ok "Actualizaciones automáticas de seguridad activas" || falla "unattended-upgrades instalado pero no activado"
else
  falla "unattended-upgrades no instalado"
fi
pend="$(apt list --upgradable 2>/dev/null | grep -c -- '-security' || true)"
[ "${pend:-0}" -eq 0 ] && ok "Sin actualizaciones de seguridad pendientes" || falla "$pend actualizaciones de seguridad pendientes"
[ -f /var/run/reboot-required ] && falla "Reinicio pendiente para aplicar actualizaciones" || ok "Sin reinicio pendiente"

titulo "6. Protección contra fuerza bruta"
systemctl is-active --quiet fail2ban && ok "fail2ban activo ($(fail2ban-client status 2>/dev/null | awk -F: '/Jail list/ {gsub(/^[ \t]+/,"",$2); print $2}'))" || falla "fail2ban inactivo o no instalado"

titulo "7. Otros"
timedatectl show -p NTPSynchronized --value 2>/dev/null | grep -q yes && ok "Hora sincronizada (NTP)" || aviso "Hora no sincronizada por NTP"
[ -s /etc/sgrc-respaldo.env ] && [ "$(stat -c %a /etc/sgrc-respaldo.env)" = "600" ] && ok "/etc/sgrc-respaldo.env con permisos 600" || aviso "/etc/sgrc-respaldo.env no existe o no tiene permisos 600 (Parte 8)"

printf '\nResultado: %d control(es) en FALLA\n' "$fallas"
exit "$fallas"
