FROM node:22-alpine AS build
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

# A diferencia de Dockerfile.prod (pensado para docker-compose con un
# servicio "migrate" separado), aquí todo corre en un solo contenedor
# porque EasyPanel despliega un servicio de app por su cuenta, sin un
# paso de migración aparte. Por eso se copia el node_modules completo
# (con prisma y tsx) y el arranque hace la migración antes de servir.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/prisma ./prisma

EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && npx tsx prisma/seed.ts && npm run start"]
