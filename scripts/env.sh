ROOT_DIR=$(pwd)
ENV_FILE="$ROOT_DIR/.env"

while [ $# -gt 0 ]; do
  case "$1" in
    -e|--env)
      ENV_FILE="$ROOT_DIR/$2"
      shift 2
      ;;
    *)
      break
      ;;
  esac
done

set -a
if [ -f "$ENV_FILE" ]; then
  . "$ENV_FILE"
fi
set +a