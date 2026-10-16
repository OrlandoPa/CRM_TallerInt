#!/usr/bin/env bash
# Prueba de restauración del respaldo de Supabase (Anexo F, RNF-SEG-07).
# No toca producción: descifra el respaldo, lo restaura en un Postgres
# TEMPORAL en Docker (en memoria) y compara cada tabla con producción.
# Mide el tiempo de restauración (RTO de la base) y la antigüedad del
# respaldo (RPO). Al terminar, el contenedor se elimina.
#
# Uso (como root en el VPS de n8n):
#   AGE_IDENTIDAD=/root/clave_respaldo.txt ./restaurar_prueba.sh [respaldo.dump.age]
# La clave privada se copia solo para la prueba y se borra después (§14.3).
set -Eeuo pipefail
umask 077

CONF="${CONF:-/etc/sgrc-respaldo.env}"
set -a
# shellcheck source=/dev/null
source "$CONF"
set +a
: "${AGE_IDENTIDAD:?Indica la clave privada: AGE_IDENTIDAD=/ruta/clave.txt}"
PG_IMAGEN="${PG_IMAGEN:-postgres:17}"
DIR="$(cd "$(dirname "$0")" && pwd)"
ARCHIVO="${1:-$(ls -t "$DESTINO"/supabase_*.dump.age 2>/dev/null | head -1)}"
[ -f "$ARCHIVO" ] || { echo "No hay respaldo de Supabase en $DESTINO" >&2; exit 1; }
CONT=sgrc-restauracion-prueba

CONTEO="select string_agg(format('%s=%s', c.relname,
  (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', c.relname), false, true, '')))[1]::text),
  ' ' order by c.relname)
  from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'"
ESTRUCTURA="select format('politicas=%s triggers=%s funciones=%s choques=%s',
  (select count(*) from pg_policies where schemaname = 'public'),
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid
     where c.relnamespace = 'public'::regnamespace and not t.tgisinternal),
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace),
  (select count(*) from pg_constraint where conname = 'citas_sin_choques'))"

echo "Respaldo: $(basename "$ARCHIVO")"
(cd "$(dirname "$ARCHIVO")" && grep -h "$(basename "$ARCHIVO")" SHA256SUMS_* | sha256sum -c -) \
  || { echo "La suma SHA-256 no coincide: el archivo está dañado" >&2; exit 1; }

docker rm -f "$CONT" >/dev/null 2>&1 || true
trap 'docker rm -f "$CONT" >/dev/null 2>&1 || true' EXIT
inicio=$(date +%s)
docker run -d --name "$CONT" -e POSTGRES_PASSWORD="$(head -c 24 /dev/urandom | base64)" \
  --tmpfs /var/lib/postgresql/data "$PG_IMAGEN" >/dev/null
# -h 127.0.0.1: el servidor temporal de inicialización solo escucha el socket
until docker exec "$CONT" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; do sleep 1; done

docker exec -i "$CONT" psql -U postgres -v ON_ERROR_STOP=1 -q < "$DIR/preparar_destino.sql"
# Roles que el respaldo nombra en GRANT y ALTER DEFAULT PRIVILEGES (p. ej. supabase_admin, que
# solo existe en Supabase): en un Postgres vacío faltan y pg_restore se detiene (16/10/2026).
# Se crean sin login; el nombre ya viene filtrado por la expresión regular.
roles=$(age -d -i "$AGE_IDENTIDAD" "$ARCHIVO" | docker exec -i "$CONT" pg_restore -f - \
  | grep -E '^(GRANT|REVOKE|ALTER DEFAULT PRIVILEGES) ' \
  | grep -oE '(TO|FROM|FOR ROLE) "?[A-Za-z_][A-Za-z0-9_]*' | awk '{print $NF}' | tr -d '"' \
  | grep -vx PUBLIC | sort -u || true)
for r in $roles; do
  printf "do \$\$ begin if not exists (select 1 from pg_roles where rolname = '%s') then create role \"%s\" nologin; end if; end \$\$;\n" "$r" "$r"
done | docker exec -i "$CONT" psql -U postgres -v ON_ERROR_STOP=1 -q
age -d -i "$AGE_IDENTIDAD" "$ARCHIVO" \
  | docker exec -i "$CONT" pg_restore -U postgres -d postgres --no-owner --exit-on-error
fin=$(date +%s)

restaurada=$(docker exec "$CONT" psql -U postgres -tAc "$CONTEO")
estr_rest=$(docker exec "$CONT" psql -U postgres -tAc "$ESTRUCTURA")
produccion=$(docker run --rm -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE=require "$PG_IMAGEN" psql -tAc "$CONTEO")
estr_prod=$(docker run --rm -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE -e PGSSLMODE=require "$PG_IMAGEN" psql -tAc "$ESTRUCTURA")

edad_h=$(( ( $(date +%s) - $(stat -c %Y "$ARCHIVO") ) / 3600 ))
echo
echo "Tiempo de restauración de la base: $((fin - inicio)) s"
echo "Antigüedad del respaldo: ${edad_h} h (RPO objetivo <= 24 h)"
echo
printf '%-22s %12s %12s\n' "tabla" "respaldo" "producción"
join -a1 -a2 -e '-' -o 0,1.2,2.2 \
  <(tr ' ' '\n' <<<"$restaurada" | tr '=' ' ' | sort) \
  <(tr ' ' '\n' <<<"$produccion" | tr '=' ' ' | sort) \
  | while read -r t a b; do printf '%-22s %12s %12s%s\n' "$t" "$a" "$b" "$([ "$a" = "$b" ] || echo '   (cambió desde el respaldo)')"; done
echo
echo "Estructura respaldo:   $estr_rest"
echo "Estructura producción: $estr_prod"
if [ "$estr_rest" = "$estr_prod" ]; then
  echo "RESULTADO: restauración correcta"
else
  echo "RESULTADO: la estructura no coincide" >&2
  exit 1
fi
