#!/usr/bin/env bash
# Respaldo diario cifrado del SGRC (Anexo F, Parte 8: BE-13, RNF-SEG-07).
#
# Corre en los VPS (cron diario, ver CAMBIOS_N8N.md §14). Según lo que esté
# configurado en /etc/sgrc-respaldo.env, respalda:
#   1. la base de Supabase (esquema public) con pg_dump y el rol respaldo_ro;
#   2. un Postgres en contenedor (p. ej. el de Chatwoot en el VPS 2);
#   3. los flujos y credenciales de n8n (las credenciales salen cifradas por n8n);
#   4. carpetas de configuración (docker-compose.yml, .env).
# Todo se cifra con la clave PÚBLICA de age antes de tocar el disco: la clave
# privada no está en el servidor, así que quien entre al VPS no puede leerlo.
#
# Uso: respaldo_sgrc.sh [archivo.env]   (por defecto /etc/sgrc-respaldo.env)
set -Eeuo pipefail
umask 077

CONF="${1:-/etc/sgrc-respaldo.env}"
set -a
# shellcheck source=/dev/null
source "$CONF"
set +a
: "${AGE_RECIPIENT:?Falta AGE_RECIPIENT en $CONF}" "${DESTINO:?Falta DESTINO en $CONF}"
DIAS="${DIAS:-14}"
PG_IMAGEN="${PG_IMAGEN:-postgres:17}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
EQUIPO="$(hostname -s 2>/dev/null || hostname)"
TMP="$(mktemp -d)"

ping_hc() { [ -n "${HC_URL:-}" ] && curl -fsS -m 10 --retry 3 "$@" >/dev/null 2>&1 || true; }
fallo() {
  trap - ERR
  local msg="Respaldo $EQUIPO $TS falló (línea $1)"
  echo "$msg" >&2
  ping_hc --data-raw "$msg" "$HC_URL/fail"
}
trap 'fallo $LINENO' ERR
trap 'rm -rf "$TMP"' EXIT

cifrar() { age -r "$AGE_RECIPIENT" > "$1"; }

mkdir -p "$DESTINO"
ping_hc "$HC_URL/start"

# 1. Supabase (pooler en modo sesión, puerto 5432; pg_dump no funciona con el de transacciones)
if [ -n "${PGHOST:-}" ]; then
  docker run --rm -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE=require "$PG_IMAGEN" \
    pg_dump --schema=public --no-owner -Fc \
    | cifrar "$TMP/supabase_$TS.dump.age"
fi

# 2. Postgres en un contenedor de este servidor
if [ -n "${PG_CONTENEDOR:-}" ]; then
  docker exec "$PG_CONTENEDOR" pg_dumpall -U "${PG_CONTENEDOR_USUARIO:-postgres}" \
    | cifrar "$TMP/${PG_CONTENEDOR}_$TS.sql.age"
fi

# 3. n8n
if [ -n "${N8N_CONTENEDOR:-}" ]; then
  docker exec "$N8N_CONTENEDOR" sh -c 'rm -rf /tmp/sgrc && mkdir -p /tmp/sgrc &&
    n8n export:workflow --all --separate --output=/tmp/sgrc/flujos &&
    n8n export:credentials --all --separate --output=/tmp/sgrc/credenciales' >/dev/null
  docker cp "$N8N_CONTENEDOR:/tmp/sgrc" "$TMP/n8n" >/dev/null
  docker exec "$N8N_CONTENEDOR" rm -rf /tmp/sgrc
  tar -C "$TMP" -cz n8n | cifrar "$TMP/n8n_$TS.tar.gz.age"
  rm -rf "$TMP/n8n"
fi

# 4. Configuración (rutas separadas por espacios)
if [ -n "${DIRS_CONFIG:-}" ]; then
  # shellcheck disable=SC2086
  tar -cz --absolute-names $DIRS_CONFIG | cifrar "$TMP/config_$TS.tar.gz.age"
fi

# 5. Verificar, guardar y rotar
shopt -s nullglob
archivos=("$TMP"/*.age)
[ "${#archivos[@]}" -gt 0 ] || { echo "No se configuró nada que respaldar en $CONF" >&2; false; }
# Un volcado real de la base pesa decenas de KB; uno casi vacío es un error silencioso
for f in "$TMP"/supabase_*.age; do
  [ "$(stat -c %s "$f")" -gt 4096 ] || { echo "Volcado de la base sospechosamente pequeño: $f" >&2; false; }
done
mv "${archivos[@]}" "$DESTINO"/
(cd "$DESTINO" && sha256sum ./*_"$TS".* > "SHA256SUMS_$TS")
find "$DESTINO" -type f -mtime +"$DIAS" -delete

# 6. Copia en el otro servidor (opcional): si un VPS se pierde, el otro tiene sus respaldos
if [ -n "${COPIA_DESTINO:-}" ]; then
  rsync -a -e "ssh -i ${COPIA_LLAVE:-/root/.ssh/sgrc_respaldo} -o BatchMode=yes" "$DESTINO"/ "$COPIA_DESTINO"/
fi

ping_hc "$HC_URL"
echo "Respaldo $EQUIPO $TS correcto: ${#archivos[@]} archivo(s) en $DESTINO"
