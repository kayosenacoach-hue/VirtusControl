# Usar a imagem oficial do Node 22
FROM node:22-alpine AS builder

# Criar pasta da aplicacao
WORKDIR /app

# Copiar ficheiros de dependencias primeiro (para melhor cache)
COPY package.json package-lock.json* bun.lockb* ./

# Instalar as dependencias (forçando o NPM)
RUN npm install --legacy-peer-deps

# Copiar todo o codigo do projeto
COPY . .

# Declarar as variaveis de ambiente que vao ser injetadas durante o build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_API_URL

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL

# Fazer o build do projeto Vite
RUN npm run build

# Fase 2: Servir a aplicacao gerada
FROM node:22-alpine AS runner
WORKDIR /app

# Instalar o servidor web leve
RUN npm install -g serve

# Copiar os ficheiros estaticos da fase de build
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Iniciar o servidor
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:3000"]