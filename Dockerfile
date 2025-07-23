FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN npm install -g pnpm && pnpm install --frozen-lockfile --ignore-scripts

COPY . .

RUN pnpm build

CMD ["pnpm", "start"]
