# 🐳 CliniKondo Web - Docker

Este documento explica como executar a aplicação CliniKondo Web usando Docker.

## 📋 Pré-requisitos

- Docker instalado
- Docker Compose (opcional, mas recomendado)

## ⚙️ Configuração do Ambiente

### 1. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure suas credenciais:

```bash
cp .env.docker.example .env.docker
```

Edite `.env.docker` com suas próprias credenciais:
- **Firebase**: Configure sua API key e configurações do projeto
- **LLM API**: Configure sua chave da API de IA
- **Outros**: Ajuste URLs e configurações conforme necessário

> ⚠️ **IMPORTANTE**: Nunca commite o arquivo `.env.docker` com credenciais reais!

## 🚀 Como Usar

### Método 1: Docker Compose (Recomendado)

```bash
# Build e executar a aplicação
docker-compose up --build

# Ou em background
docker-compose up -d --build
```

A aplicação estará disponível em: http://localhost:8080

### Método 2: Docker Direto

```bash
# Build da imagem
docker build -t clinikondo-web .

# Executar o container
docker run -p 8080:80 clinikondo-web
```

### Método 3: Script Completo (Build + Run) - RECOMENDADO

```bash
# Build da imagem com variáveis injetadas + execução automática
./run-docker.sh
```

Este script faz o build da imagem com todas as variáveis de ambiente injetadas durante o processo de build, garantindo que a aplicação tenha todas as configurações necessárias.

### Método 4: Docker com Arquivo de Ambiente

```bash
# Usando arquivo .env.docker
docker run -p 8080:80 --env-file .env.docker clinikondo-web
```

### Método 5: Docker Compose com Ambiente

```yaml
# docker-compose.yml (já configurado)
version: '3.8'
services:
  clinikondo-web:
    build: .
    ports:
      - "8080:80"
    env_file:
      - .env.docker  # Arquivo de ambiente
```

## 🏗️ Arquitetura do Dockerfile

### Multi-Stage Build

1. **Builder Stage** (`node:18-alpine`):
   - Instala dependências npm
   - Copia código fonte
   - Executa `npm run build`
   - Gera arquivos otimizados em `/app/dist`

2. **Production Stage** (`nginx:alpine`):
   - Usa nginx para servir arquivos estáticos
   - Configuração otimizada para SPA
   - Porta 80 exposta

### Otimizações

- **Gzip**: Compressão automática de assets
- **Cache**: Headers apropriados para cache de assets estáticos
- **SPA Support**: Redirecionamento automático para `index.html`
- **Security**: Headers de segurança básicos
- **Health Check**: Endpoint `/health` para monitoramento

## 🔧 Configuração

### Variáveis de Ambiente

**IMPORTANTE**: As variáveis `VITE_*` são injetadas durante o **build**, não no runtime. O script `run-docker.sh` já inclui todas elas automaticamente.

#### Como Funciona:

1. **Build Time**: Variáveis são passadas como `--build-arg` para o Docker
2. **Vite Build**: As variáveis são injetadas no código JavaScript durante a compilação
3. **Runtime**: A aplicação já tem as configurações hardcoded no bundle

#### Arquivos Disponíveis:
- **`.env.docker`** - Arquivo de referência (não usado no build)
- **`run-docker.sh`** - Script que faz build + run com variáveis corretas

### Volumes (Opcional)

```yaml
volumes:
  - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

## 📊 Monitoramento

### Health Check

A aplicação inclui um endpoint de health check:
```bash
curl http://localhost:8080/health
# Deve retornar: "healthy"
```

### Logs

```bash
# Ver logs do container
docker-compose logs -f clinikondo-web

# Ou para container direto
docker logs -f <container_id>
```

## 🛠️ Desenvolvimento vs Produção

### Desenvolvimento
```bash
npm run dev  # Porta 5173
```

### Produção (Docker)
```bash
docker-compose up --build  # Porta 8080
```

## 📦 Build Manual

Se preferir build manual:

```bash
# Instalar dependências
npm ci

# Build da aplicação
npm run build

# Servir localmente (teste)
npm run preview
```

## 🔒 Segurança

- Imagem baseada em Alpine Linux (mínima)
- Nginx configurado com headers de segurança
- Sem exposição desnecessária de portas
- Build multi-stage (não inclui dev dependencies na imagem final)

## 📈 Performance

- Assets otimizados e minificados
- Gzip automático
- Cache inteligente de assets estáticos
- Imagem final ~20MB (nginx alpine + assets)

## 🐛 Troubleshooting

### Container não inicia
```bash
docker-compose logs clinikondo-web
```

### Aplicação não carrega
- Verificar se a build foi bem-sucedida
- Verificar variáveis de ambiente do Firebase
- Verificar conectividade de rede

### Build lento
- Verificar se `.dockerignore` está funcionando
- Usar Docker BuildKit: `DOCKER_BUILDKIT=1 docker build`

## 📝 Notas

- A aplicação é uma SPA (Single Page Application)
- Todas as rotas são redirecionadas para `index.html`
- Firebase config deve ser fornecida via variáveis de ambiente
- Build otimizado para produção com Vite