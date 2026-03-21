# Usar a imagem oficial do Node 22
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependências
COPY package.json package-lock.json* bun.lockb* ./
RUN npm install --legacy-peer-deps

# Copiar todo o código
COPY . .

# Fazer o build do projeto (agora vai ler o .env diretamente)
RUN npm run build

# Fase 2: Servir a aplicação
FROM node:22-alpine AS runner
WORKDIR /app

RUN npm install -g serve
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Iniciar o servidor aberto para a internet
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:3000"]