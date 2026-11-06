FROM node:22-alpine AS build
WORKDIR /app
COPY . .
ARG NEXT_PUBLIC_API_URL=https://gsw226.xyz
ENV NODE_OPTIONS=--max-old-space-size=1024
RUN npm ci && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
