#!/bin/sh
set -e

# # 데이터베이스가 준비될 때까지 대기 (최대 30초)
# MAX_ATTEMPTS=30
# until npx sequelize-cli db:version >/dev/null 2>&1; do
#   if [ $MAX_ATTEMPTS -le 0 ]; then
#     echo "❌  데이터베이스에 연결할 수 없습니다. 종료합니다."
# 	sleep 1000
#     exit 1
#   fi
#   echo "⏳  DB 연결 대기 중..."
#   MAX_ATTEMPTS=$((MAX_ATTEMPTS - 1))
#   sleep 1
# done

# echo "✅  DB 연결 성공! 마이그레이션 실행"

# npx sequelize-cli db:migrate
# # 필요 시 시드 실행
# # npx sequelize-cli db:seed:all

echo "🚀  서버 시작"
exec npm run dev