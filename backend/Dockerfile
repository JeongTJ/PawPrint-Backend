FROM node:18-alpine

WORKDIR /app

# 의존성 레이어 캐싱
COPY ./srcs/package*.json ./
RUN npm ci --production

# 앱 소스
COPY ./srcs .

# 엔트리포인트 스크립트 복사 및 권한 부여
COPY ./entrypoint.sh ../entrypoint.sh
RUN chmod +x ../entrypoint.sh

EXPOSE 8000

CMD ["../entrypoint.sh"]