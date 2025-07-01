#!/bin/sh
set -e

echo "🚀 서버 시작"


# 환경변수에 따라 실행 모드 결정
if [ "$NODE_ENV" = "production" ]; then
    npm install --production
    echo "🏭 Production 모드로 실행"
    exec npm run start
else
    npm install --development
    echo "🛠️ Development 모드로 실행"
    exec npm run dev
fi