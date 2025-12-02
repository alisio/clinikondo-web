🏥✨ Especificação de Requisitos de Software (SRS)

Produto: CliniKondo Web Edition

Versão: 1.3 (Thumbnails Visuais)

Data: 1 de Dezembro de 2025

---

## 📋 Índice Rápido

| Seção | Descrição | Para Quem |
|-------|-----------|-----------|
| [1. Introdução](#1-introdução) | O que é CliniKondo e seu propósito | Todos |
| [2. Arquitetura](#2-arquitetura-do-sistema) | Como o sistema é construído | Devs + Gerentes |
| [3. Modelo de Dados](#3-modelo-de-dados-entidades) | Tabelas e relacionamentos (explicados!) | Devs + Analistas |
| [4. Requisitos Funcionais](#4-requisitos-funcionais-rf) | O que o sistema faz | Todos |
| [5. Regras de Negócio](#5-regras-de-negócio-rn) | Regras que governam o sistema | Todos |
| [6. Interface & UX](#6-interface-e-ux) | Como o sistema se parece | Designers + Devs |
| [7. Requisitos Não-Funcionais](#7-requisitos-não-funcionais-rnf) | Performance, segurança, etc | Devs + Ops |
| [8. Glossário](#8-glossário-de-termos-técnicos) | Explicação de termos | 🆕 Leigos + Iniciantes |
| [9. FAQ](#9-faq---perguntas-frequentes) | Respostas a dúvidas comuns | 🆕 Todos |
| [10. Implementações Futuras](#10-implementações-futuras) | Funcionalidades planejadas | Devs + Gerentes |

---

## ✨ Resumo em 30 Segundos

**O que é?** Um app web que organiza seus documentos médicos (PDFs, fotos) automaticamente usando IA.

**Como funciona?**
1. Você envia exames, receitas, laudos
2. IA lê e classifica automaticamente (tipo, especialidade, data, paciente)
3. Tudo fica organizado e pesquisável com **thumbnails visuais** para identificação rápida

**Para quem?** Famílias que têm muitos documentos médicos espalhados.

**Diferencial:** Sem login complicado — email/senha. Processamento rápido (< 6s por doc). Upload em massa inteligente. **Thumbnails visuais** para melhor identificação. Seguro (só você vê seus dados).

---

1. 📘 Introdução

1.1 Propósito

O CliniKondo Web é uma plataforma de organização médica pessoal projetada para transformar arquivos digitais desorganizados (PDFs de exames, fotos de receitas) em um arquivo digital estruturado, pesquisável e seguro. O sistema utiliza Inteligência Artificial para classificar documentos automaticamente e uma interface gráfica moderna para facilitar o gerenciamento familiar.

1.2 Escopo

O sistema opera como uma Single Page Application (SPA) acessível via navegador. Ele permite que múltiplos usuários gerenciem seus próprios "ambientes" de saúde de forma isolada. O software gerencia o ciclo de vida completo do documento: desde o upload via "arrastar e soltar", passando pelo reconhecimento de texto (OCR) e classificação via LLM, até o armazenamento estruturado em nuvem (metadados e arquivos).

**Nível de Produção**: A aplicação é desenvolvida para ambiente de produção, onde usuários reais armazenam, visualizam e recuperam seus documentos médicos.

2. 🏗️ Arquitetura do Sistema

O CliniKondo utiliza uma arquitetura Serverless centrada no cliente, onde a lógica de orquestração reside no navegador, consumindo serviços de API para persistência e inteligência.

2.1 Diagrama de Componentes

graph TD
    subgraph "Camada de Apresentação (Client-Side)"
        UI[Interface React + Tailwind]
        Router[Gerenciador de Visualizações]
        State[Estado Global da Aplicação]
    end

    subgraph "Camada Lógica (Client-Side)"
        Orchestrator[Processador de Fila]
        OCR_Service[Adaptador de OCR]
        LLM_Service[Cliente OpenAI/LLM]
        Matcher[Algoritmo de Fuzzy Matching]
    end

    subgraph "Camada de Dados & Serviços (Cloud)"
        Firebase_Auth[Autenticação]
        Firebase_DB[Banco de Dados NoSQL]
        Ext_LLM[API de LLM Externa]
    end

    UI --> State
    State --> Orchestrator
    Orchestrator --> OCR_Service
    Orchestrator --> LLM_Service
    LLM_Service --> Ext_LLM
    State --> Firebase_DB
    State --> Firebase_Auth


2.2 Stack Tecnológico

Frontend: HTML5, React 18, Tailwind CSS (execução via browser/CDN).

Autenticação & Banco de Dados: Firebase Auth e Firestore.

Armazenamento de Arquivos: Firebase Storage para persistência de documentos originais.

Inteligência Artificial: Integração com APIs de LLM (ex: OpenAI GPT-4) para classificação e extração.

Ícones: Lucide-react (SVG vetorial).

2.3 Fluxo de Extração de Texto (OCR/Vision - Híbrido)

**O que é?** O sistema "lê" documentos automaticamente, extraindo o texto escrito neles — como um olho eletrônico. Usa dois métodos conforme necessário:

**Tipos de Documentos Suportados:**
- 📄 **PDFs com texto digital**: Arquivos PDF criados no computador (ex: exame enviado por email)
- 🖼️ **Fotos/Imagens com texto**: Receitas fotografadas com celular, exames escaneados
- ✍️ **Manuscritos**: Receitas escritas à mão, anotações

**Como funciona (em 5 passos simples):**

**1️⃣ Receber e validar arquivo**
   - Confirmar que é PDF, JPG ou PNG
   - Rejeitar se arquivo > 50MB (muito grande)
   - Tempo máximo: 30 segundos por arquivo
   - *(Analogia: como uma portaria que verifica se o pacote é válido)*

**2️⃣ Tentar extrair texto direto (PDFs)**
   - Se o PDF tem texto "copiável", extrai rapidamente (< 1 segundo)
   - Funciona em ~80% dos PDFs médicos
   - *(Analogia: como copiar texto de um documento Word)*
   - Se não funcionar → vai para etapa 3

**3️⃣ Usar inteligência artificial para ler imagens** (se não funcionou etapa 2)
   - Envia a imagem para um "olho de IA" (Vision LLM)
   - A IA "lê" o documento mesmo que tenha handwriting
   - Tempo: ~2-4 segundos
   - Tenta 2x se falhar na primeira
   - *(Analogia: como perguntar para alguém ler em voz alta o que está escrito)*

**4️⃣ Classificar o documento** (usando IA)
   - A IA lê o texto extraído e identifica:
     - **Tipo**: É exame? Receita? Laudo?
     - **Especialidade**: De qual médico? Cardiologia? Pediatria?
     - **Data**: Quando foi?
     - **Confiança**: Tenho certeza? (0% = dúvida total, 100% = certeza)
   - Se confiança < 50%: marca para você revisar manualmente
   - *(Analogia: como colocar em uma pasta com rótulo "Exame Cardiologia - Nov 2025")*

**Schema de Saída do LLM (JSON):**

```json
{
  "classification": {
    "type": "Exame",
    "specialty": "Cardiologia",
    "date": "2025-11-29",
    "confidence": 95,
    "reasoning": "Laudo assinado por cardiologista, menciona função ventricular e pressão arterial"
  },
  "patient_names": [
    {
      "name": "Maria Silva dos Santos",
      "role": "paciente",
      "confidence": 98
    },
    {
      "name": "Dr. Carlos Alberto",
      "role": "physician",
      "confidence": 99
    }
  ],
  "key_findings": [
    "Função ventricular dentro dos limites normais",
    "Sem alterações significativas",
    "Pressão normal"
  ],
  "tags": [
    "cardiologia",
    "função ventricular",
    "pressão arterial",
    "laudo"
  ],
  "document_metadata": {
    "issued_date": "2025-11-29",
    "extraction_quality": "high",
    "is_handwritten": false, 
    "language": "pt-BR"
  }
}
```

**Descrição dos campos:**

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `type` | string | Categoria do documento | "Exame", "Receita", "Laudo", "Vacina", "Outro" |
| `specialty` | string | Especialidade médica | "Cardiologia", "Pediatria", "Oftalmologia" |
| `date` | string (ISO 8601) | Data do documento (AAAA-MM-DD) | "2025-11-29" |
| `confidence` | number (0-100) | Confiança geral da IA | 95 |
| `reasoning` | string | Explicação breve do motivo da classificação | "Laudo assinado por cardiologista..." |
| `patient_names` | array | Pessoas encontradas no texto | [{name, role, confidence}] |
| `key_findings` | array | Achados/informações principais | ["Sem alterações", "Pressão normal"] |
| `tags` | array | Palavras-chave e termos relevantes extraídos do documento para busca semântica | ["dipirona", "febre", "gripe"] |
| `extraction_quality` | enum | Qualidade da extração | "high", "medium", "low" |
| `is_handwritten` | boolean | Contém manuscrito? | false |
| `language` | string | Idioma do documento | "pt-BR", "en-US" |

**Lógica de decisão com base no schema:**

```
confidence ≥ 90%     → ✅ Aceita automaticamente
confidence 75-89%    → 🟡 Aceita com aviso (revisar opcionalmente)
confidence 50-74%    → 🟠 Marca para revisão manual
confidence < 50%     → ❌ Rejeita (usuário revisa)
```

**Exemplo de uso prático:**

```json
Input (texto extraído):
"CARDIOGRAMA
Paciente: JOÃO SILVA
Data: 15/11/2025
Dr. Cardiologe: Dr. Carlos Alberto
Achados: Ritmo normal, sem arritmias..."

↓ (LLM processa) ↓

Output (schema acima):
{
  "classification": {
    "type": "Exame",
    "specialty": "Cardiologia",
    "date": "2025-11-15",
    "confidence": 92
  },
  "patient_names": [
    { "name": "João Silva", "role": "paciente", "confidence": 98 },
    { "name": "Dr. Carlos Alberto", "role": "physician", "confidence": 97 }
  ]
}

↓ (Sistema valida) ↓

Resultado: 
- Confiança 92% ≥ 90% ✅
- Vincula automaticamente como "Exame Cardiologia"
- Nome do paciente: "João Silva" (será feito fuzzy matching)
```

**5️⃣ Vincular ao paciente** (match automático)
   - A IA procura no texto por nomes de pacientes
   - Compara com seus pacientes cadastrados (incluindo apelidos)
   - Se encontra 1 match claro (90%+ certeza): vincula automaticamente
   - Se encontra múltiplos: pede para você confirmar
   - *(Analogia: como reconhecer automaticamente se o exame é da Maria ou da Juju)*

**O que acontece se algo der errado?**

| Problema | O que o sistema faz |
|----------|---------------------|
| **Arquivo > 50MB** | Rejeita antes de começar (mensagem clara ao usuário) |
| **Formato errado** (ex: .word) | Rejeita — só aceita PDF/JPG/PNG |
| **PDF não consegue extrair texto** | Passa para etapa 3 (usa IA para ler) |
| **IA demora demais** (> 15s) | Tenta novamente 1x, depois marca como erro |
| **IA está sobrecarregada** (muitas requisições) | Espera um pouco e tenta novamente até 2x |
| **IA falha permanentemente** | Coloca arquivo em fila para você revisar depois |
| **Classificação falha** | Marca com confiança 0%, pede revisão manual |
| **Não consegue identificar paciente** | Deixa em branco, você vincula depois |

*(Analogia: como um assistente que tenta tudo possível, mas se não conseguir, escreve um bilhete para você resolver depois)*

**Performance e Custo:**

| Tipo de Arquivo | Velocidade | Custo | Acurácia |
|---------|---------|-------|----------|
| PDF normal (com texto) | < 1 segundo | Grátis | 99% (quase perfeito) |
| PDF sem texto ou imagem | ~4 segundos | Muito barato | 92% (muito bom) |
| Manuscrito | ~6 segundos | Muito barato | 70% (aceitável) |

**💰 Custo mensal com 100 arquivos:**
- Se você enviar 100 documentos por mês, gastará aproximadamente **R$ 0,20** com IA
- *(Mais barato que um café)*

**Velocidade média:** Um documento leva entre 1-6 segundos para processar (depende do tipo)

**⚙️ Configuração técnica necessária:**

*Para o desenvolvedor definir (não para usuário final):*
```
- Qual IA usar (DeepInfra)
- Chave de acesso (senha da IA)
- Modelos de IA a usar (vision: para ler imagens, classify: para categorizar)
- Tempo máximo de espera para cada etapa
```

**🔒 SEGURANÇA IMPORTANTE:**
- ⚠️ **NUNCA** deixar a chave da IA visível no código
- **Solução:** Criar um intermediário (proxy) que:
  1. Recebe o documento do usuário
  2. Valida que é usuário legítimo (token)
  3. Envia para IA com chave privada (segura)
  4. Retorna resultado para usuário
  5. *(Analogia: como um porteiro que autentica visitantes antes de deixar chamar o serviço)*

3. 🧱 Modelo de Dados (Entidades)

**O que é?** Assim como um consultório tem fichas de pacientes, documentos e prontuários, o sistema tem um banco de dados que guarda tudo organizado. Cada tipo de informação tem seu lugar específico.

**Analogia do mundo real:**
```
Consultório físico          →  Sistema digital
├─ Cadastro de pacientes   →  users (você)
├─ Fichas de família        →  patients (seus filhos, esposa)
├─ Pasta com exames        →  documents (PDFs, fotos)
└─ Anotações internas      →  auditLog (quem mexeu em quê)
```

---

3.1 Você (users)

Sua conta no sistema. É como seu CPF digital — identifica você de forma única.

| Campo | O que é | Obrigatório |
|-------|--------|-------------|
| **uid** | Número único que o sistema gera para você (como CPF) | ✓ |
| **email** | Seu email (para recuperar senha, acessar conta) | ✓ |
| **joinedAt** | Data que você se cadastrou | ✓ |
| **lastLogin** | Última vez que você acessou o sistema | ✓ |
| **documentCount** | Quantos documentos você tem (total) | ✓ |
| **storageUsedMB** | Quanto espaço seus arquivos usam (em MB) | ✓ |

**Como o sistema te identifica:** Sua conta é linkada por email. Só você pode acessar seus dados.

---

3.2 Pacientes (patients)

A "família" — pessoas cujos exames você guarda (você, filhos, esposa, etc.)

| Campo | O que é | Obrigatório |
|-------|--------|-------------|
| **id** | Número único para cada pessoa | ✓ |
| **userId** | ID de quem é o dono (você) | ✓ |
| **name** | Nome completo (ex: "Maria Silva") | ✓ |
| **slug** | Versão simplificada do nome, sem espaços (ex: "maria_silva") | ✓ |
| **gender** | Sexo (M = Masculino, F = Feminino, O = Outro) | ✓ |
| **aliases** | Apelidos/variações do nome (ex: "Mariazinha", "Mimi") | ✗ |
| **dateOfBirth** | Data de nascimento | ✗ |
| **relationship** | Parentesco (você mesmo, esposa, filho, pai, etc.) | ✗ |
| **isShared** | Se o paciente é visível para membros do grupo familiar (RF21) | ✗ |
| **createdAt** | Quando foi cadastrado | ✓ |
| **updatedAt** | Última vez que editou | ✓ |
| **documentCount** | Quantos exames essa pessoa tem | ✓ |

**Regras importantes:**
- Cada slug é único por usuário (só você pode ter um "maria_silva")
- Nome não pode estar em branco
- Apelidos não podem se repetir (se tem "Juju", não pode adicionar "Juju" de novo)

---

3.3 Documentos (documents)

Seus exames, receitas, laudos — tudo que você envia. O sistema rastreia cada um desde upload até processamento final.

**Ciclo de vida de um documento:**
```
Você envia → Processando → Pronto (com informações extraídas)
                 ↓
             (se erro) → Revisão manual
```

| Campo | O que é | Obrigatório |
|-------|--------|-------------|
| **id** | Número único do documento | ✓ |
| **userId** | De quem é (seu ID) | ✓ |
| **originalName** | Nome original do arquivo ("scan.pdf") | ✓ |
| **finalName** | Nome organizado ("2025-11-29-maria_silva-exame-cardiologia.pdf") | ✓ |
| **type** | Categoria: Exame? Receita? Laudo? Vacina? | ✓ |
| **specialty** | Especialidade: Cardiologia? Pediatria? | ✓ |
| **patientId** | De qual pessoa é esse documento? | ✗ (você vincula depois) |
| **date** | Data do documento (extraída automaticamente) | ✓ |
| **confidence** | Confiança da IA (0-100%). Ex: 95% = IA tem certeza | ✓ |
| **status** | Situação: pendente, processando, pronto, erro | ✓ |
| **errorReason** | Se teve erro, qual foi? | ✗ |
| **reviewRequired** | Precisa você revisar? (se IA tem dúvida) | ✓ |
| **fileUrl** | Link para baixar o arquivo | ✓ |
| **fileSize** | Tamanho do arquivo em MB | ✓ |
| **extractedContent** | Texto que a IA leu do documento | ✓ |
| **extractedMetadata** | Dados estruturados que a IA extraiu (backup) | ✓ |
| **tags** | Palavras-chave extraídas pela IA (ex: ["dipirona", "febre", "antitérmico"]) | ✓ |
| **manualTags** | Tags adicionadas manualmente pelo usuário (RF18) | ✗ |
| **suggestedPatients** | Sugestões de quem é o paciente: "Pode ser Maria (95% certeza)" | ✓ |
| **uploadedAt** | Data/hora que enviou | ✓ |
| **processedAt** | Data/hora que terminou de processar | ✗ |
| **updatedAt** | Última alteração | ✓ |

**Exemplos de finalName (nome organizado):**
- `2025-11-29-joao_silva-exame-cardiologia.pdf` (exame de João dia 29/11/2025)
- `2025-10-15-maria-receita-pediatria.jpg` (receita da Maria em 15/10/2025)

**Regras importantes:**
- Arquivo máximo: 50MB
- Tipos válidos: Exame, Receita, Laudo, Vacina, Outro
- O sistema busca documentos rápido por: status, data, confiança, paciente

3.4 Fila de Processamento (processingQueue) [Client-Side]

**O que é?** É como uma "lista de tarefas" do sistema enquanto processa seus documentos.

**Nota de implementação:** Esta fila é gerenciada no navegador (client-side) via React Context, não é persistida no Firestore.

**Analogia:** Você escreve tarefas em um adesivo na sua mesa. Conforme faz, marca como pronto.

| Campo | O que é |
|-------|--------|
| **id** | Número único da tarefa |
| **documentId** | Qual documento está processando |
| **userId** | De quem é |
| **stage** | Em qual etapa está? (extração, classificação, combinação, pronto, erro) |
| **progress** | Progresso: 0% (iniciou), 50% (meio), 100% (pronto) |
| **retryCount** | Quantas vezes tentou novamente (máximo 3) |
| **errorLog** | Se teve erro, escreve o motivo aqui |
| **createdAt** | Quando começou |
| **expiresAt** | Expira após 24h (limpeza automática) |

**Importante:** Fica no computador do usuário enquanto processa (IndexedDB), depois sincroniza com servidor

3.5 Auditoria (auditLog) [Futuro - não no v1]

**O que é?** Um "registro de auditoria" — rastreia tudo que acontece no sistema (para segurança e compliance legal).

**Exemplo:** "Dia 29/11 às 10h, João Silva baixou o exame XYZ"

| Campo | O que é |
|-------|--------|
| **id** | Número único |
| **userId** | Quem fez |
| **action** | O que fez? (criou, editou, deletou, baixou) |
| **entityType** | O quê? (documento, paciente, conta) |
| **entityId** | Qual (ID específico) |
| **changes** | O que mudou (antes/depois) |
| **timestamp** | Quando |

**Nota:** Será adicionado em futura versão (v2) do sistema

---

3.6 Grupos Familiares (familyGroups)

**O que é?** Permite que múltiplos usuários (ex: pai e mãe) compartilhem acesso aos documentos médicos da família.

**Status:** Implementado na versão 1.0.

**Analogia:** Como uma pasta compartilhada no Google Drive — várias pessoas podem ver os mesmos arquivos.

| Campo | O que é | Obrigatório |
|-------|--------|-------------|
| **id** | Número único do grupo | ✓ |
| **name** | Nome do grupo (ex: "Família Silva") | ✓ |
| **ownerId** | ID do administrador (quem criou) | ✓ |
| **memberIds** | Lista de IDs dos membros | ✓ |
| **createdAt** | Data de criação | ✓ |
| **updatedAt** | Última modificação | ✓ |

3.7 Membros do Grupo (familyMembers)

**O que é?** Detalha as permissões de cada membro dentro do grupo familiar.

**Status:** Implementado na versão 1.0.

| Campo | O que é | Obrigatório |
|-------|--------|-------------|
| **id** | Número único | ✓ |
| **groupId** | Qual grupo | ✓ |
| **userId** | Qual usuário | ✓ |
| **role** | Papel: admin, editor, viewer | ✓ |
| **invitedBy** | Quem convidou | ✓ |
| **invitedAt** | Quando foi convidado | ✓ |
| **acceptedAt** | Quando aceitou o convite | ✗ |
| **status** | pending, active, removed | ✓ |

**Regras:**
- Só o `admin` pode convidar/remover membros
- `editor` pode fazer upload e editar documentos
- `viewer` só pode visualizar e baixar

---

**Como tudo se conecta?**

```
Você (users)
├─ Seu perfil
├─ Seus pacientes (patients)
│  └─ Documentos deles
└─ Sua fila de processamento
```

**Exemplo real (com grupo familiar):**
```
Grupo: Família Silva
├─ Admin: João Silva (pai)
├─ Membro: Ana Silva (mãe) - role: editor
│
├─ Paciente 1: João Junior (filho) - visível para grupo
│  └─ Documentos compartilhados
│
└─ Paciente 2: João Silva (pai) - privado
   └─ Documentos só João vê
```

**Exemplo real:**
```
João Silva (você)
├─ Cadastrado em: 01/01/2025
├─ Email: joao@email.com
│
├─ Paciente 1: Maria Silva (esposa)
│  ├─ Apelidos: ["Mimi", "Mari"]
│  └─ Documentos:
│     ├─ 2025-11-29-maria_silva-exame-cardiologia.pdf
│     └─ 2025-11-15-maria_silva-receita-pediatria.jpg
│
└─ Paciente 2: João Junior (filho)
   └─ Documentos:
      └─ 2025-10-20-joao_junior-vacina-pediatria.jpg
```

**🔒 Regras de Segurança:**

- Você só acessa SEUS dados (João não vê dados de Maria)
- Você só pode vincular documentos a SEUS pacientes cadastrados
- O sistema automaticamente valida: "Este documento é seu? Sim? Então permite"
- *(Analogia: como um cofre que só abre com sua chave)*

4. ✨ Requisitos Funcionais (RF)

Módulo 1: Acesso e Segurança

ID

Requisito

Descrição

RF01

Autenticação

O sistema deve permitir login e registro via E-mail/Senha usando Firebase.

RF02

Isolamento de Dados

Um usuário só pode visualizar e manipular pacientes e documentos criados por ele (vinculados ao seu uid).

RF03

Sessão Persistente

O login deve ser mantido entre recarregamentos da página (state persistence).

Módulo 2: Gestão de Pacientes

ID

Requisito

Descrição

RF04

Cadastro de Pacientes

O usuário deve poder criar perfis para familiares, definindo nome e gênero.

RF05

Gestão de Aliases

O usuário deve poder cadastrar e editar apelidos ou variações de nome para pacientes, incluindo a possibilidade de adicionar apelidos adicionais a pacientes já cadastrados, para melhorar a detecção automática (Ex: "Juju" para "Julia").

RF06

Visualização de Família

Interface em formato de cards listando todos os membros cadastrados. Cada card deve ser clicável, navegando diretamente para a tela de arquivos filtrada por aquele paciente.

Módulo 3: Processamento Inteligente

ID

Requisito

Descrição

RF07

Upload Drag & Drop

Área de interface para arrastar múltiplos arquivos (PDF, JPG, PNG) simultaneamente.

RF08

Fila de Processamento

Visualização do status de cada arquivo (Aguardando, Processando, Concluído) com barras de progresso.

RF09

Classificação via IA

O sistema deve extrair texto e usar um LLM para determinar: Tipo, Especialidade e Data do documento.

RF10

Associação Automática

O sistema deve cruzar nomes encontrados no documento com a lista de Pacientes/Aliases para sugerir o dono do arquivo.

RF11

Upload em Massa com Paciente Pré-selecionado

O usuário deve poder selecionar um paciente antes do upload, fazendo com que todos os documentos enviados sejam automaticamente associados a esse paciente, pulando o processo de matching automático e confirmação manual.

Módulo 4: Arquivo Digital (Dashboard)

ID

Requisito

Descrição

RF11

Visão Hierárquica

Navegação estruturada: Paciente -> Tipo de Documento.

RF12

Busca e Filtros

Barra de pesquisa e filtros na página de Arquivos para filtrar documentos por nome, tipo, especialidade, paciente ou conteúdo de texto extraído. Inclui busca semântica com expansão de sinônimos médicos.

RF13

Dashboard de Métricas

Visão geral contendo total de documentos processados e estatísticas de uso.

RF14

Visualização de Documentos

O sistema deve incluir um recurso para visualização direta dos documentos, permitindo ao usuário abrir e visualizar uma prévia em texto do conteúdo extraído, metadados (tipo, especialidade, data, confiança) e informações do paciente vinculado.

RF15

Download de Documentos

O sistema deve permitir ao usuário baixar o arquivo original (PDF ou imagem exatamente como foi enviado) com o nome padronizado (finalName) para armazenamento local ou compartilhamento externo.

RF16

Extração de Tags via IA

O sistema deve extrair automaticamente palavras-chave (tags) de cada documento durante o processamento. As tags devem incluir: medicamentos mencionados, sintomas, diagnósticos, procedimentos e termos médicos relevantes. Exemplo: uma receita para gripe deve gerar tags como ["dipirona", "antitérmico", "febre", "repouso", "vitamina c"].

RF17

Busca Semântica com Sinônimos

O sistema deve expandir automaticamente os termos de busca utilizando um dicionário de sinônimos médicos. Ao buscar por "gripe", o sistema deve também buscar documentos com tags relacionadas como "resfriado", "virose", "febre", "tosse", "congestão nasal", "dipirona", "antitérmico", etc. O usuário não precisa conhecer o termo exato usado no documento.

RF18

Gerenciamento Manual de Tags

O sistema deve permitir ao usuário adicionar, editar e remover tags manualmente em qualquer documento. Isso possibilita:
- Complementar tags extraídas automaticamente pela IA com informações que o usuário considera relevantes
- Corrigir tags incorretas ou imprecisas
- Adicionar tags personalizadas para facilitar buscas futuras (ex: "urgente", "acompanhamento", "check-up anual")
- As tags manuais devem ser diferenciadas visualmente das tags automáticas (ex: ícone ou cor diferente)
- Máximo de 20 tags por documento (automáticas + manuais)
- Cada tag deve ter no máximo 50 caracteres

RF19

Thumbnails Visuais de Documentos

O sistema deve gerar e exibir automaticamente uma miniatura visual (thumbnail) para cada documento processado, facilitando a identificação rápida e melhorando a experiência do usuário. Funcionalidades:
- Para PDFs: Thumbnail da primeira página renderizada em baixa resolução (48x48px)
- Para imagens: Versão reduzida da imagem original (48x48px, mantendo proporção)
- Exibição no canto superior esquerdo de cada card de documento na tela de Arquivos
- Fallback automático: Se thumbnail não carregar, exibir ícone tradicional do tipo de documento
- Geração automática durante o processamento, sem intervenção do usuário
- Armazenamento otimizado no Firebase Storage com compressão automática

Módulo 5: Compartilhamento Familiar

ID

Requisito

Descrição

RF20

Grupos Familiares

O sistema deve permitir a criação de "Grupos Familiares" onde múltiplos usuários (cada um com sua própria conta) podem compartilhar acesso aos mesmos pacientes e documentos. Funcionalidades:
- Um usuário cria o grupo e se torna o "administrador"
- O administrador convida outros membros por email
- Membros convidados recebem email com link de convite
- Ao aceitar, o membro passa a ver os pacientes e documentos do grupo
- Cada membro mantém sua própria conta (login individual)
- O administrador pode remover membros a qualquer momento
- Máximo de 10 membros por grupo familiar

RF21

Compartilhamento por Paciente

O sistema deve permitir compartilhamento granular por paciente dentro do grupo familiar:
- O dono original de um paciente pode escolher se o paciente será visível para todo o grupo ou apenas para si
- Pacientes marcados como "privados" não aparecem para outros membros do grupo
- Documentos seguem a visibilidade do paciente ao qual estão vinculados
- Documentos não vinculados a nenhum paciente são privados por padrão
- Níveis de permissão por membro:
  - **Visualizar**: pode ver e baixar documentos
  - **Editar**: pode adicionar tags, vincular pacientes, editar metadados
  - **Gerenciar**: pode fazer upload, deletar documentos e editar pacientes

**Regras especiais de visibilidade:**
- **Paciente-Membro**: Quando um paciente representa um membro do grupo (ex: "Ana Silva" é paciente E membro), o membro sempre tem acesso aos seus próprios documentos, independente de quem fez o upload ou da configuração de privacidade
- **Visibilidade para terceiros**: A configuração "privado/compartilhado" define apenas se OUTROS membros do grupo (que não são o próprio paciente) podem ver os documentos
- **Upload cruzado**: Qualquer membro com permissão "Gerenciar" pode fazer upload para qualquer paciente compartilhado do grupo; o documento fica automaticamente visível para o paciente-membro (se aplicável) e para o grupo (se paciente for compartilhado)

**Exemplo prático:**
```
Grupo: Família Silva
├─ Membro: João (admin)
├─ Membro: Ana (editor) ←→ Paciente: Ana Silva
├─ Paciente: Filho João Jr (compartilhado)
└─ Paciente: João (privado)

Cenário: João faz upload de exame para "Ana Silva"
→ Ana vê: SIM (é sobre ela)
→ João vê: SIM (fez upload)
→ Se Ana for "compartilhada": outros membros também veem
→ Se Ana for "privada": só Ana e João veem

Cenário: João faz upload em massa de 50 exames para "Maria Silva"
→ Seleciona Maria no seletor antes do upload
→ Todos os 50 documentos são processados automaticamente
→ Nenhum modal de confirmação aparece
→ Todos ficam vinculados a Maria sem intervenção manual
```

5. 🔄 Regras de Negócio (RN)

RN01 - Padrão de Nomenclatura

Todo documento processado com sucesso deve ter seu nome lógico (finalName) alterado para o seguinte padrão, visando organização em caso de download:
AAAA-MM-DD-slug_paciente-tipo-especialidade.ext
Exemplo: 2025-11-19-joao_silva-exame-cardiologia.pdf

RN02 - Fuzzy Matching (Reconciliação de Nomes)

O sistema não deve exigir correspondência exata de nomes. Deve-se utilizar algoritmos de similaridade (Levenshtein ou similar) para identificar que "Jonatan Silva" no documento refere-se ao paciente cadastrado "Jonathan da Silva".

RN03 - Validação de Arquivos

O sistema deve rejeitar arquivos maiores que 50MB ou formatos não suportados (apenas PDF e Imagens são permitidos) antes de iniciar o upload para economizar recursos.

RN04 - Dicionário de Sinônimos Médicos

O sistema deve manter um dicionário de sinônimos para termos médicos comuns. O dicionário agrupa termos relacionados para expandir buscas automaticamente:

| Termo Principal | Sinônimos/Termos Relacionados |
|-----------------|-------------------------------|
| gripe | resfriado, virose, rinite, tosse, febre, congestão nasal, coriza, dor de garganta, dipirona, paracetamol, antitérmico, descongestionante, vitamina c, imunidade |
| diabetes | glicemia, insulina, hemoglobina glicada, hipoglicemia, hiperglicemia, metformina |
| hipertensão | pressão alta, anti-hipertensivo, losartana, enalapril, amlodipina |
| dor de cabeça | cefaleia, enxaqueca, migrânea, analgésico |
| alergia | rinite alérgica, urticária, anti-histamínico, loratadina, prurido |
| infecção | antibiótico, amoxicilina, azitromicina, inflamação, febre |

**Funcionamento:**
- Ao buscar "gripe", o sistema busca: `tags ∈ [gripe, resfriado, virose, rinite, ...]`
- O dicionário pode ser expandido pelo administrador
- Tags extraídas são normalizadas (minúsculas, sem acentos)

6. 🖱️ Interface e UX

O sistema deve ser responsivo e dividido em quatro seções principais acessíveis por uma barra lateral fixa.

---

6.1 Layout Geral

```
┌─────────────────────────────────────────────────────────┐
│  CliniKondo                                   👤 | ⚙️    │
├──────────┬──────────────────────────────────────────────┤
│ 📊 Dashboard   │ Bem-vindo, João!                     │
│ 🚀 Processor   │ Você tem 42 documentos               │
│ 👨‍👩‍👧 Pacientes  │                                      │
│ 📁 Arquivos    │ 📈 Últimos 7 dias: +12 docs          │
│              │ 💾 Espaço usado: 245 MB / 1 GB         │
│              │                                        │
│              │ [Botão: + Enviar Documentos]           │
└──────────┴──────────────────────────────────────────────┘
```

---

6.2 Tela 1: Dashboard (Visão Macro)

**Propósito:** Primeira impressão — resumo geral e ações principais.

```
┌─ Dashboard ──────────────────────────────────────────────┐
│                                                           │
│  📊 ESTATÍSTICAS                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Total de Docs │ Docs Pronto │ Em Processo │ Erros │  │
│  │       42      │     38      │      3      │   1   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  👨‍👩‍👧 PACIENTES (Cards)                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   👩 Maria    │  │   👦 João Jr  │  │   👶 Sofia   │   │
│  │   8 docs     │  │  12 docs     │  │   2 docs     │   │
│  │  Última: Nov │  │ Última: Nov  │  │ Última: Out  │   │
│  │     23       │  │     25       │  │     15       │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                           │
│  ⚡ AÇÕES RÁPIDAS                                         │
│  [📤 Novo Upload] [📋 Ver Pendentes] [⚙️ Configurar]    │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Campos visíveis:**
- Total de documentos, processados, em fila, erros
- Cards dos pacientes com contador de docs e data do último
- Botões: Upload, Ver pendentes, Configurações

---

6.3 Tela 2: Smart Processor (Upload & Fila)

**Propósito:** Onde o "trabalho" acontece — enviar e acompanhar processamento. Permite upload em massa com paciente pré-selecionado para eficiência.

```
┌─ Smart Processor ────────────────────────────────────────┐
│                                                           │
│  👤 PACIENTE PARA UPLOAD EM MASSA (opcional)             │
│  [Selecionar paciente ▼]                                 │
│  └─ Todos os documentos serão vinculados a: Maria Silva │
│                                                           │
│  📤 ARRASTAR E SOLTAR                                    │
│  ╔════════════════════════════════════════════════════╗  │
│  ║                                                    ║  │
│  ║   Arraste arquivos aqui ou clique para escolher    ║  │
│  ║                                                    ║  │
│  ║   (Aceita: PDF, JPG, PNG - Máx: 50MB)             ║  │
│  ║                                                    ║  │
│  ╚════════════════════════════════════════════════════╝  │
│                                                           │
│  📋 FILA DE PROCESSAMENTO                                │
│                                                           │
│  1️⃣  scan_exame.pdf (Maria Silva)                       │
│     [███████████░░░░░░░░░░░░░░░░] 45%                   │
│     ✅ Etapa 1: Extração (concluída)                    │
│     ⏳ Etapa 2: Classificação (processando...)           │
│     ⏰ Próxima: Vincular paciente                        │
│     ⏱️  Tempo: 2s / Estimado: 6s                         │
│                                                           │
│  2️⃣  receita_farmacia.jpg (Você)                        │
│     [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0%                │
│     ⏳ Aguardando...                                      │
│     [Cancelar]                                           │
│                                                           │
│  ✅ 3️⃣  laudo_coracoes.pdf (João Junior)                 │
│     [████████████████████████████] 100% ✓                │
│     Concluído em: 4.2s                                  │
│     Classificado como: Exame - Cardiologia               │
│     Confiança: 95%                                       │
│     [Ver] [Revisar] [Download]                          │
│                                                           │
│  ❌ 4️⃣  foto_ilegivel.png                                │
│     [████░░░░░░░░░░░░░░░░░░░░░░░░░] 20%                │
│     Erro na etapa 2: IA não conseguiu extrair texto      │
│     [Retry] [Descartar] [Ver Log]                       │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Campos visíveis:**
- Área drag & drop com validação
- Lista de documentos em processamento
- Barra de progresso por documento
- Etapas atuais
- Tempo decorrido/estimado
- Botões de ação (Ver, Cancelar, Retry)
- Ícones para status (✅, ⏳, ❌)

**Interações:**
- **Selecionar paciente (opcional):** Antes do upload, escolher um paciente para associar automaticamente todos os documentos enviados
- **Upload em massa:** Arrastar múltiplos arquivos simultaneamente
- **Monitoramento em tempo real:** Acompanhar progresso de cada documento na fila

**Benefícios do Upload em Massa:**
- Eficiência: Processar 100+ documentos sem confirmação individual
- Precisão: Evitar erros de matching automático para pacientes com nomes similares
- Rapidez: Vinculação direta quando paciente é conhecido previamente

6.4 Tela 3: Pacientes (Gestão de Família)

**Propósito:** Criar, editar, gerenciar membros da família e acessar seus documentos rapidamente. Com ferramentas avançadas de busca para facilitar localização em listas grandes.

```
┌─ Pacientes ──────────────────────────────────────────────┐
│                                                           │
│  🔍 [Buscar pacientes por nome, apelido ou parentesco...] │
│  [+ Adicionar novo paciente]                             │
│                                                           │
│  Mostrando 3 de 15 pacientes                              │
│                                                           │
│  👩 MARIA SILVA                              [✎ Editar]  │
│  ├─ Gênero: Feminino                                     │
│  ├─ Parentesco: Esposa                                   │
│  ├─ Data de Nascimento: 15/05/1985                       │
│  ├─ Apelidos: Mimi, Mari                                 │
│  │  [+ Adicionar apelido] [Mari ✕]                       │
│  └─ Documentos: 8                                        │
│                                                           │
│  👦 JOÃO JUNIOR SILVA                      [✎ Editar]   │
│  ├─ Gênero: Masculino                                    │
│  ├─ Parentesco: Filho                                    │
│  ├─ Data de Nascimento: 20/03/2010                       │
│  ├─ Apelidos: Juju, JJ                                   │
│  │  [+ Adicionar apelido] [Juju ✕] [JJ ✕]               │
│  └─ Documentos: 12                                       │
│                                                           │
│  👶 SOFIA SILVA                             [✎ Editar]   │
│  ├─ Gênero: Feminino                                     │
│  ├─ Parentesco: Filha                                    │
│  ├─ Data de Nascimento: 08/12/2015                       │
│  ├─ Apelidos: (nenhum)                                   │
│  │  [+ Adicionar apelido]                                │
│  └─ Documentos: 2                                        │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Campos visíveis:**
- Campo de busca avançada com ícone
- Contador de resultados filtrados
- Lista de pacientes em cards responsivos
- Nome, gênero, parentesco
- Data de nascimento
- Apelidos (com opção de adicionar/remover)
- Contador de documentos
- Botões: Editar, Adicionar

**Interações:**
- **Busca avançada:** Filtragem em tempo real por nome, apelidos ou parentesco
- **Clique no card do paciente:** Navega diretamente para a tela "Arquivos" filtrada por aquele paciente
- **Responsividade:** Layout adaptável (1-4 colunas dependendo da tela)
- **Acessibilidade:** Navegação por teclado, labels ARIA, suporte a leitores de tela

**Funcionalidades de UX:**
- **Paginação implícita:** Contador mostra "X de Y pacientes" para orientação
- **Estado vazio inteligente:** Mensagem específica quando busca não encontra resultados
- **Performance:** Filtragem otimizada com useMemo para listas grandes

---

6.5 Tela 4: Arquivos (Consulta & Download)

**Propósito:** Buscar, visualizar, baixar documentos processados.

```
┌─ Arquivos ────────────────────────────────────────────────┐
│                                                            │
│  🔍 [Buscar por nome, tipo ou especialidade...]           │
│  Filtros: [📁 Tipo ▼] [👨‍⚕️ Especialidade ▼] [📅 Data ▼]  │
│                                                            │
│  👩 MARIA SILVA  (8 documentos)                            │
│  ├─ [📄] 2025-11-29-maria_silva-exame-cardiologia.pdf     │
│  │  Tipo: Exame | Especialidade: Cardiologia             │
│  │  Data: 29/11/2025 | Confiança: 95% ⭐⭐⭐⭐⭐            │
│  │  [👁️ Visualizar] [📥 Download] [✎ Editar]            │
│  │                                                        │
│  ├─ [💊] 2025-11-15-maria_silva-receita-pediatria.jpg     │
│  │  Tipo: Receita | Especialidade: Pediatria             │
│  │  Data: 15/11/2025 | Confiança: 88% ⭐⭐⭐⭐             │
│  │  [👁️ Visualizar] [📥 Download] [✎ Editar]            │
│  │                                                        │
│  └─ [🩺] 2025-10-03-maria_silva-laudo-oftalmologia.pdf    │
│     Tipo: Laudo | Especialidade: Oftalmologia             │
│     Data: 03/10/2025 | Confiança: 92% ⭐⭐⭐⭐⭐           │
│     [👁️ Visualizar] [📥 Download] [✎ Editar]            │
│                                                            │
│  👦 JOÃO JUNIOR SILVA  (12 documentos)                    │
│  ├─ [💉] 2025-10-20-joao_junior-vacina-pediatria.jpg      │
│     ...                                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Nota:** Os colchetes `[📄]` representam os thumbnails visuais. Na implementação real, são imagens miniatura de 48x48px mostrando preview do documento (primeira página para PDFs, imagem reduzida para fotos). Se o thumbnail não carregar, volta automaticamente para o ícone emoji tradicional.

**Campos visíveis:**
- Barra de busca
- Filtros por tipo, especialidade, data
- Lista hierárquica (paciente → documentos)
- Nome organizado (finalName)
- Metadados: tipo, especialidade, data, confiança
- Ícones de status (⭐ = confiança visual)
- Botões: Visualizar, Download, Editar

**Interações:**
- **Grupos expansíveis:** Clique no cabeçalho para expandir/colapsar documentos por paciente
- **Vinculação manual:** Dropdown em documentos não vinculados permite seleção de paciente
- **Filtros dinâmicos:** Atualização em tempo real da lista conforme filtros
- **Navegação modal:** Visualização detalhada abre em modal overlay

---

6.6 Tela 5: Visualização de Documento (Modal/Página)

**Propósito:** Ver detalhes completos e texto extraído.

```
┌─ Exame - Cardiologia (29/11/2025) ──────────────────────┐
│  [← Voltar]                                             │
│                                                         │
│  📊 METADADOS                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Nome: 2025-11-29-maria_silva-exame-cardiologia  │   │
│  │ Tipo: Exame                                     │   │
│  │ Especialidade: Cardiologia                      │   │
│  │ Data: 29/11/2025                                │   │
│  │ Paciente: Maria Silva (Esposa)                  │   │
│  │ Confiança da IA: 95% ✓                          │   │
│  │ Status: Pronto                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📝 TEXTO EXTRAÍDO (Preview)                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ LAUDO CARDIOLÓGICO                              │   │
│  │ Paciente: MARIA SILVA DOS SANTOS                │   │
│  │ Data do Exame: 29/11/2025                       │   │
│  │ Médico: Dr. Carlos Alberto                      │   │
│  │ Especialidade: Cardiologia                      │   │
│  │                                                 │   │
│  │ ACHADOS:                                        │   │
│  │ - Função ventricular dentro dos limites normais │   │
│  │ - Sem alterações significativas                 │   │
│  │ - Pressão normal                                │   │
│  │ ...                                             │   │
│  │ [Ver texto completo →]                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [👁️ Visualizar Original] [📥 Download] [⚙️ Editar]   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

6.7 Guia de Estilo Visual

| Aspecto | Especificação | Exemplo |
|---------|--------------|---------|
| **Cores Primárias** | Teal (#14B8A6) - saúde & confiança | ████ |
| **Cores Secundárias** | Verde (#10B981) = sucesso, Vermelho (#EF4444) = erro | ████ |
| **Tipografia** | Inter ou Segoe UI, 16px base | Título: 24px, Bold |
| **Espaçamento** | Grid 8px: 8, 16, 24, 32 | Margin: 16px |
| **Ícones** | Lucide-react, 20-24px | 📊 📤 🔍 |
| **Estados Visuais** | Hover (20% darker), Active, Disabled (50% opacity) | Button on hover |
| **Feedback** | Toast (2-3s bottom right), Spinner em processamento | ✅ Success |

---

6.8 Responsividade

- **Desktop (1024px+):** Barra lateral fixa, 4 colunas em grid
- **Tablet (768-1023px):** Barra lateral colapsável, 2 colunas
- **Mobile (< 768px):** Barra lateral colapsável (menu hambúrguer), 1 coluna, full-width

7. 🛡️ Requisitos Não-Funcionais (RNF)

ID

Categoria

Descrição

RNF01

Portabilidade

O sistema deve ser distribuído preferencialmente como um arquivo único ou pacote estático simples, sem dependência de instalação de Python/Node.js local pelo usuário final.

RNF02

Performance

O processamento de IA não deve bloquear a interface (non-blocking UI). O usuário deve poder navegar enquanto arquivos são processados.

RNF03

Configuração

As credenciais (API Keys, Firebase Config) devem ser injetáveis via variáveis de ambiente ou arquivo de configuração, não hardcoded no código fonte público.

---

8. 📚 Glossário de Termos Técnicos

Se você está lendo isso e encontrou um termo desconhecido, este glossário ajuda!

### A

**API (Interface de Programação de Aplicações)**
- O quê: Um "intermediário" que permite que dois programas se comuniquem
- Analogia: Como um recepcionista que recebe seu pedido e passa para o departamento correto
- Exemplo: Quando você clica "Login com Google", o CliniKondo usa a Google API

**Apelido (Alias)**
- O quê: Uma variação do nome de uma pessoa
- Exemplo: "Juju" para "Júlia", "Mimi" para "Maria"
- Por quê: A IA consegue reconhecer melhor pessoas quando tem múltiplas variações do nome

### B

**Backend**
- O quê: A "cozinha" do sistema — onde as contas, dados e lógica complicada ficam
- Analogia: Você nunca vê o cozinheiro, mas ele prepara sua comida nos bastidores
- Comparação: **Frontend** = o que você vê, **Backend** = o que funciona atrás das cortinas

**Base64**
- O quê: Uma forma de converter imagens/arquivos em texto para enviar pela internet
- Analogia: Como tirar uma foto, convertê-la em mensagem morse, enviar, e depois converter de volta
- Razão: Sistemas de Internet preferem texto, não arquivos binários

### C

**Cloud (Nuvem)**
- O quê: Servidores em outro lugar (internet) que guardam seus dados
- Analogia: Ao invés de guardar em um cofre na sua casa, você guarda em um banco seguro em outro bairro
- Vantagem: Pode acessar de qualquer computador/celular

**Confiança (Confidence)**
- O quê: Quão certo a IA está sobre uma classificação (0-100%)
- Exemplo: 95% de confiança = "Tenho 95% de certeza que este é um exame de cardiologia"
- Uso: Se < 50%, o sistema pede para você revisar manualmente

### E

**Enum (Enumeração)**
- O quê: Uma lista fixa de opções
- Exemplo: Para "Gênero", as opções são APENAS: Masculino, Feminino, Outro
- Razão: Garante consistência — não pode digitar "XYZ" acidentalmente

### F

**Firebase**
- O quê: Serviço da Google que fornece autenticação, banco de dados e storage
- Analogia: Uma "caixa de ferramentas pronta" — você não precisa criar tudo do zero
- Componentes: 
  - Firebase Auth = login/senha
  - Firestore = banco de dados
  - Firebase Storage = guarda seus PDFs/fotos

**Firestore**
- O quê: Banco de dados em nuvem (não relacional)
- Diferença: Em vez de tabelas (Excel), armazena "documentos" (como fichas)
- Vantagem: Flexível — cada "ficha" pode ter campos diferentes

**Frontend**
- O quê: O que você vê na tela — a interface
- Analogia: O restaurante onde você senta e come
- Comparação: **Frontend** = tela bonita, **Backend** = cozinha onde prepara

**Fuzzy Matching (Correspondência Flexível)**
- O quê: Encontrar similaridades mesmo com pequenos erros/variações
- Exemplo: "Jonatan Silva" no documento combina com "Jonathan da Silva" cadastrado (não é cópia exata, mas similar)
- Algoritmo: Levenshtein (conta diferenças entre strings)
- Valor: Threshold ≥ 0.75 = 75% de semelhança

### I

**IndexedDB**
- O quº: Um banco de dados LOCAL no seu computador (no navegador)
- Analogia: Um arquivo que você mantém em casa, sem enviar para a nuvem
- Uso: Armazenar fila de processamento enquanto você trabalha offline
- Vantagem: Rápido e não usa internet

### J

**JWT (JSON Web Token)**
- O quê: Um "cartão de identidade digital" que prova quem você é
- Analogia: Como um passaporte — você mostra para provar que é autorizado
- Uso: Quando você faz login, recebe um JWT que prova ao sistema que é você
- Duração: Expira em um tempo (ex: 7 dias)

### L

**LLM (Large Language Model)**
- O quê: Uma IA treinada em BILHÕES de palavras para entender texto
- Exemplos: ChatGPT, Mistral, Llama
- Uso no CliniKondo: Classificar documento ("Isso é um exame?") e extrair dados ("Qual data?")
- Treinamento: Aprendeu lendo bilhões de textos da internet

### M

**Metadata (Metadados)**
- O quê: Dados "sobre dados" — informações que descrevem o arquivo
- Exemplo: Para um PDF, os metadados são: tamanho, data de criação, tipo, especialidade
- Analogia: Como uma etiqueta colada no arquivo dizendo "Isso é um exame de cardiologia"

### N

**NoSQL (Banco de Dados Não-Relacional)**
- O quê: Banco de dados que NÃO usa tabelas (como Excel)
- Comparação: 
  - SQL = tabelas com colunas fixas (como planilha)
  - NoSQL = documentos flexíveis (como fichas)
- Vantagem: Cada registro pode ter diferentes campos

### O

**OCR (Reconhecimento Óptico de Caracteres)**
- O quê: IA que "lê" uma imagem e extrai o texto escrito nela
- Exemplo: Você fotografa uma receita com celular → OCR extrai o texto
- Tecnologia: Vision LLM faz isso no CliniKondo

### P

**Proxy (Intermediário)**
- O quê: Um serviço que fica entre você e outro serviço
- Analogia: Um mensageiro que passa recados entre pessoas
- Uso no CliniKondo: 
  - Você envia documento → Proxy recebe → Valida se é você → Chama IA → Retorna resultado
  - Razão: Esconde a chave da IA (segurança)

### R

**Rate Limiting (Limite de Requisições)**
- O quê: Máximo de requisições que você pode fazer em um tempo
- Exemplo: "Máximo 100 requisições por minuto"
- Razão: Evitar abuso e manter servidor funcionando bem

**Regex (Expressão Regular)**
- O quê: Uma "linguagem" para encontrar padrões em texto
- Exemplo: Encontrar todos os emails em um texto (padrão: `algo@dominio.com`)
- Uso: Validar formatos (email válido? Data válida?)

**RESTful API**
- O quê: Uma forma padronizada de comunicação entre programas via HTTP
- Métodos: GET (buscar), POST (criar), PUT (atualizar), DELETE (deletar)
- Analogia: Como um cardápio de restaurante — você pede (requisição) e recebe (resposta)

### S

**Segurança de Dados**
- Conceitos importantes:
  - **Criptografia**: Transformar dado legível em código ilegível
  - **JWT**: Token para provar autenticação
  - **HTTPS**: Comunicação codificada (não clara)
  - **Firestore Rules**: Regras que definem quem pode ver/mexer em quê

**SPA (Single Page Application)**
- O quê: Um app web que não recarrega a página inteira
- Analogia: Um caderno onde você folheia — não precisa comprar novo a cada página
- Comparação:
  - SPA = Rápido, responsivo (Instagram, Gmail)
  - Tradicional = Recarrega a cada ação (antigos)

**Slug**
- O quê: Versão simplificada de um nome, sem espaços/acentos
- Exemplo: "Maria Silva" → slug: "maria_silva"
- Uso: Identificador simples para URLs e banco de dados

### T

**Thumbnail**
- O quê: Uma imagem pequena (miniatura) que representa um documento maior
- Analogia: Como uma foto polaroid pequena de um álbum inteiro
- Exemplo: Para PDFs, mostra a primeira página reduzida; para fotos, mostra versão pequena
- Vantagem: Permite identificar documentos rapidamente sem abri-los
- Tamanho: 48x48 pixels no CliniKondo

**Timeout**
- O quê: Tempo máximo para algo terminar
- Exemplo: "Se a IA não responder em 15 segundos, desista"
- Razão: Evitar ficar esperando para sempre

### U

**UUID (Identificador Único Universal)**
- O quê: Um número/texto único que identifica algo
- Exemplo: `550e8400-e29b-41d4-a716-446655440000`
- Vantagem: Praticamente impossível ter 2 UUIDs iguais
- Uso: ID de documentos, pacientes, usuários

### V

**Vision LLM (IA que enxerga)**
- O quê: Uma IA treinada em reconhecer IMAGENS (não só texto)
- Exemplo: Mostrar foto de receita manuscrita → ela "lê" mesmo sendo handwriting
- Modelo usado: Llama 2 Vision
- Diferença: LLM normal não vê imagens, só lê texto

### W

**Web Worker**
- O quê: Um "programa paralelo" que roda no navegador sem travar a interface
- Analogia: Você digita no Word enquanto um corretor automático funciona nos bastidores
- Uso: Processar OCR/LLM sem congelar a tela

---

9. ❓ FAQ - Perguntas Frequentes

### Sobre o Sistema

**P: O CliniKondo armazena meus documentos de forma segura?**

R: Sim. Seus dados estão em servidores Google (Firebase) com criptografia. Cada usuário só acessa seus próprios documentos — você não vê dados de outros.

**P: Posso usar o CliniKondo offline?**

R: Parcialmente. Você pode navegar nos dados já carregados, mas upload e processamento precisam de internet.

**P: Quanto espaço tenho disponível?**

R: Depende do plano. No v1, limite sugerido é 1GB por usuário (suficiente para ~1000 documentos médicos).

---

### Sobre Upload & Processamento

**P: Por que meu arquivo foi rejeitado?**

R: Possíveis razões:
- Arquivo > 50MB (muito grande)
- Formato não suportado (aceita só PDF, JPG, PNG)
- Arquivo corrompido/ilegível

**P: Quanto tempo leva para processar um documento?**

R: 
- PDF com texto: < 1 segundo
- Imagem/PDF sem texto: 4-6 segundos
- Manuscrito complexo: até 10 segundos

**P: A IA sempre acerta na classificação?**

R: Não. Taxa de acurácia:
- PDF com texto: 99% (quase perfeito)
- Imagens: 92% (muito bom)
- Manuscritos: 70% (aceitável)

Se confiança < 50%, o sistema pede para você revisar manualmente.

**P: O que significa "Confiança 85%"?**

R: A IA está 85% certa sobre aquela classificação. Exemplo:
- 95% = "Tenho quase certeza"
- 50% = "Poderia ser isso ou aquilo"
- 30% = "Estou bem em dúvida"

**P: Posso tentar novamente um documento que falhou?**

R: Sim. Tem um botão "Retry" na fila de processamento que tenta reprocessar até 3 vezes.

**P: Como funciona o upload em massa para um paciente específico?**

R: Antes de enviar os arquivos, selecione o paciente no menu dropdown "Paciente (opcional)". Todos os documentos enviados serão automaticamente vinculados a esse paciente, pulando a etapa de confirmação manual. Ideal para organizar exames de uma consulta ou laboratório.

---

### Sobre Pacientes & Documentos

**P: Posso cadastrar o mesmo paciente múltiplas vezes?**

R: Não. O sistema não permite duplicatas. Mas você pode adicionar apelidos/variações do nome.

**P: Quantos apelidos posso adicionar por paciente?**

R: Máximo 10 apelidos. Cada um até 50 caracteres.

**P: A IA consegue reconhecer automaticamente o paciente?**

R: Sim, com limites:
- Se encontra nome MUITO parecido (90%+ semelhança) → vincula automaticamente
- Se encontra 2-3 possibilidades → pede sua confirmação
- Se não encontra nada → deixa em branco para você definir depois

**P: O que é esse "finalName" complicado?**

R: É só o nome organizado do arquivo. Exemplo:
- Nome original: `scan_medicina123.pdf`
- finalName: `2025-11-29-maria_silva-exame-cardiologia.pdf`

Razão: Facilita organizar e procurar depois. Padrão: `AAAA-MM-DD-paciente-tipo-especialidade.ext`

---

### Sobre Segurança

**P: Quem pode ver meus documentos?**

R: Só você. O sistema bloqueia qualquer acesso não autorizado. Nem os desenvolvedores podem ver seus dados (regra de segurança automática).

**P: Minha senha está segura?**

R: Sim. Firebase usa HTTPS (criptografia) e melhores práticas de segurança. Sua senha nunca fica visível.

**P: O texto extraído é criptografado?**

R: Sim, em trânsito (durante envio) e em repouso (armazenado). Conexão HTTPS garante isso.

**P: Como funciona a IA? Ela vê TODOS os documentos?**

R: Não. A IA recebe APENAS seu documento, processa, retorna classificação. Não fica com histórico, não vê outros documentos.

**P: Meus dados podem ser vendidos?**

R: Não. Política: Seus dados são seus. O sistema não vende, compartilha ou usa para treinar IAs.

---

### Sobre Performance & Custos

**P: E se eu enviar 1000 documentos de uma vez?**

R: O sistema processa em fila (um por vez na maioria dos casos). Tempo total: ~30-60 minutos dependendo do tipo.

**P: Quanto custa usar o CliniKondo?**

R: 
- Uso básico: Gratuito (durante beta)
- Custo de IA: ~R$ 0,002 por documento processado
- 100 docs/mês ≈ R$ 0,20 (negligenciável)

Quando sair de beta, plano sugerido: R$ 9,90/mês com limite de 100 docs.

**P: Por que a primeira vez é mais lenta?**

R: O navegador está carregando todas as bibliotecas (pdfjs, componentes React). Depois fica rápido.

**P: Posso usar em mobile?**

R: Sim, funciona. Mas upload de arquivo em mobile pode ser chato (sem drag-drop). Recomendado: desktop para upload, mobile para consultar.

---

### Sobre Problemas Comuns

**P: Meu upload congelou na tela. O que faço?**

R:
1. Espere 2 minutos (às vezes leva mesmo)
2. Recarregue a página (F5)
3. Tente novamente
4. Se persistir: limpe cache do navegador

**P: Perdi minha senha, como recupero?**

R: Na tela de login, clique "Esqueceu a senha?" → email de recuperação é enviado → clique no link → defina nova senha.

**P: Deletei um paciente acidentalmente. Como recupero?**

R: Não há "lixeira" no v1. Se foi acidental: contato suporte com email/hora do acidente para recuperação.

**P: Meu banco de dados "saiu do ar". Perdi tudo?**

R: Improvável. Google garante 99.99% uptime. Se acontecer, seus dados estão em backup automático (recuperável em horas).

**P: Como faço backup dos meus documentos?**

R: 
- Opção 1: Download individual via botão (cada arquivo recebe finalName)
- Opção 2: Futura API que permite export em bulk
- Recomendado: Fazer backup mensal de documentos importantes

---

### Sobre Desenvolvimento

**P: Vou precisar programar para usar o CliniKondo?**

R: Não. É uma aplicação web pronta — você só acessa pelo navegador.

**P: Posso usar a API do CliniKondo em meu app?**

R: No v1, não. API para terceiros será adicionada em v2.

**P: Como faço para reportar um bug?**

R: Envie email com:
- Descrição do problema
- Steps para reproduzir
- Seu email/usuário
- Screenshot se possível

---

### Glossário Rápido para Iniciantes

| Termo | Significado Simples |
|-------|-------------------|
| **Login** | Entrar no sistema com email/senha |
| **PDF** | Arquivo de documento (como papel digital) |
| **IA** | Computador inteligente que aprende |
| **Upload** | Enviar arquivo do seu computador para nuvem |
| **Download** | Salvar arquivo da nuvem no seu computador |
| **Nuvem** | Internet/servidor em outro lugar |
| **Cache** | Memória rápida do navegador |
| **API** | Intermediário que faz programa A falar com programa B |
| **Erro 404** | Arquivo não encontrado |
| **Timeout** | Esperou demais, desistiu |

---

## 🚀 10. Implementações Futuras

Esta seção descreve funcionalidades planejadas para versões futuras do CliniKondo, priorizando melhorias baseadas em feedback de usuários e avanços tecnológicos.

### 10.1 Agente de IA Conversacional com RAG (Retrieval-Augmented Generation)

**Descrição**: Implementar um chatbot integrado na interface para que usuários façam perguntas sobre documentação existente e dados de pacientes. O agente usará RAG para combinar busca semântica em embeddings de documentos com geração de respostas via LLM, garantindo respostas contextuais e precisas.

**Objetivos**:
- Permitir consultas naturais como "Quais exames o paciente João fez no último ano?" ou "Explique o laudo do exame X".
- Integrar com Firestore para dados de pacientes e Firebase Storage para documentos indexados.
- Garantir isolamento de dados por usuário/família, com autenticação obrigatória.

**Benefícios**:
- Melhora UX ao reduzir tempo de busca manual.
- Aumenta acessibilidade para usuários não-técnicos.
- Potencial para reduzir suporte humano.

**Cronograma Estimado**: v2.0 (Q1 2026), após testes de RAG em ambiente controlado.

**Dependências Técnicas**:
- Indexação de documentos com embeddings (e.g., via Pinecone ou Firebase Extensions).
- Integração com API de LLM (OpenAI ou similar).
- Componente de chat responsivo em React.

**Riscos e Mitigações**:
- Custos: Monitorar uso de API; implementar limites por usuário.
- Privacidade: Garantir que dados não sejam enviados para LLMs externos sem criptografia/anomização.
- Precisão: Testes rigorosos para evitar respostas incorretas; incluir disclaimers.