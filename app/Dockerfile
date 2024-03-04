FROM node:18.19.0-alpine3.19 as base

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY src/package*.json ./

# テストステージ
FROM base AS test
RUN npm ci
COPY src ./
COPY test_asset ./test_asset
CMD [ "npm", "test" ]

# 検証・本番ステージ
FROM base AS prod
RUN npm ci --only=production
COPY src ./
EXPOSE 3000
CMD [ "npm", "start" ]
