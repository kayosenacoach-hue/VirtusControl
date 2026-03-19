# Usar a imagem oficial do Node 22
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependências
COPY package.json package-lock.json* bun.lockb* ./
RUN npm install --legacy-peer-deps

# Copiar todo o código
COPY . .

# Receber as variáveis do Easypanel
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_API_URL

# TRUQUE DE MESTRE: Forçar a criação do ficheiro .env para o Vite ler as chaves!
RUN echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" > .env && \
    echo "VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}" >> .env && \
    echo "VITE_API_URL=${VITE_API_URL}" >> .env

# Fazer o build do projeto
RUN npm run build

# Fase 2: Servir a aplicação
FROM node:22-alpine AS runner
WORKDIR /app

RUN npm install -g serve
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Iniciar o servidor aberto para a internet
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:3000"]