# CliniKondo Web Edition

Plataforma de organização médica pessoal que transforma arquivos digitais desorganizados em um arquivo digital estruturado, pesquisável e seguro utilizando Inteligência Artificial.

## Funcionalidades

- **Upload Inteligente**: Suporte a drag-and-drop para PDFs, JPGs e PNGs
- **Classificação por IA**: Identificação automática de tipo, especialidade e data do documento
- **Reconhecimento de Pacientes**: Vinculação de documentos a familiares via fuzzy matching
- **Busca Avançada**: Filtros por tipo, especialidade, paciente ou texto extraído
- **Busca Semântica com Sinônimos** (RF17): Expansão de buscas com vocabulário médico
- **Tags Automáticas** (RF16): Classificação de documentos com tags baseadas em IA
- **Gerenciamento de Tags** (RF18): Adição, remoção e customização manual de tags
- **Grupos Familiares** (RF19): Criação de grupos para compartilhar documentos entre múltiplos usuários
- **Compartilhamento por Paciente** (RF20): Controle granular de visibilidade por paciente dentro do grupo
- **Organização Hierárquica**: Visualização de documentos agrupados por paciente
- **Download Padronizado**: Arquivos renomeados no formato `AAAA-MM-DD-paciente-tipo-especialidade.ext`

## Stack Tecnológico

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Autenticação**: Firebase Auth
- **Banco de Dados**: Firestore
- **Storage**: Firebase Storage
- **IA/LLM**: DeepInfra API (Llama 2 para classificação, LLaVA para visão)
- **PDF**: pdfjs-dist para extração de texto
- **Busca**: Fuse.js para fuzzy matching
- **UI**: Lucide React para ícones, react-hot-toast para notificações
- **Upload**: react-dropzone para drag-and-drop
- **Roteamento**: react-router-dom v6

## Instalação

### Pré-requisitos

- Node.js 18+
- Conta Firebase configurada
- API Key de LLM (opcional para desenvolvimento)

### Setup

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/clinikondo-web.git
cd clinikondo-web
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais Firebase:
```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

4. **Configure o Firebase**

No console do Firebase:
- Ative Authentication com Email/Senha
- Crie um banco Firestore
- Configure as regras de segurança (veja abaixo)
- Ative o Storage
- Crie os índices compostos necessários (veja `firestore.indexes.json`)

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

## Regras de Segurança (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isCreatingOwn() {
      return isAuthenticated() && request.resource.data.userId == request.auth.uid;
    }
    
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }
    
    match /patients/{patientId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow read: if isAuthenticated() && resource.data.isShared == true;
      allow create: if isCreatingOwn();
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    match /documents/{documentId} {
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow read: if isAuthenticated() && resource.data.patientId != null;
      allow create: if isCreatingOwn();
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && resource.data.patientId != null;
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    match /familyGroups/{groupId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && 
        request.resource.data.ownerId == request.auth.uid &&
        request.auth.uid in request.resource.data.memberIds;
      allow update: if isAuthenticated() && 
        (request.auth.uid in resource.data.memberIds || 
         request.auth.uid in request.resource.data.memberIds);
      allow delete: if isAuthenticated() && resource.data.ownerId == request.auth.uid;
    }
    
    match /familyMembers/{memberId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || resource.data.invitedBy == request.auth.uid);
      allow delete: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || resource.data.invitedBy == request.auth.uid);
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Estrutura do Projeto

```
src/
├── components/                    # Componentes reutilizáveis
│   ├── FamilyGroupManager.jsx     # Gerenciamento de grupos familiares (RF19)
│   ├── PatientMatchModal.jsx      # Modal de vinculação de pacientes
│   ├── PatientSharingSettings.jsx # Configurações de compartilhamento (RF20)
│   ├── TagManager.jsx             # Gerenciador de tags (RF18)
│   └── ui/                        # Componentes UI primitivos
│       ├── EmptyState.jsx
│       ├── LoadingScreen.jsx
│       ├── Modal.jsx
│       └── Spinner.jsx
├── contexts/                      # React Context
│   ├── AuthContext.jsx            # Autenticação e perfil do usuário
│   ├── FamilyContext.jsx          # Estado do grupo familiar (RF19)
│   └── ProcessingContext.jsx      # Fila de processamento de documentos
├── layouts/                       # Layouts de página
│   ├── AuthLayout.jsx             # Layout para páginas de autenticação
│   └── MainLayout.jsx             # Layout principal com sidebar
├── lib/                           # Utilitários e configurações
│   ├── firebase.js                # Configuração Firebase
│   ├── constants.js               # Constantes (tipos, especialidades, sinônimos)
│   └── utils.js                   # Funções utilitárias
├── pages/                         # Páginas da aplicação
│   ├── auth/                      # Login, Registro, Reset de senha
│   ├── DashboardPage.jsx          # Visão geral e estatísticas
│   ├── FilesPage.jsx              # Listagem e busca de documentos
│   ├── PatientsPage.jsx           # Gerenciamento de pacientes
│   └── ProcessorPage.jsx          # Upload e processamento de documentos
├── services/                      # Serviços e integrações
│   ├── aiService.js               # Classificação por IA e extração de tags
│   ├── extractionService.js       # Extração de texto de PDFs
│   ├── familyService.js           # Operações de grupos familiares (RF19, RF20)
│   └── firestoreService.js        # Operações CRUD Firestore
├── App.jsx                        # Router principal
├── main.jsx                       # Entry point
└── index.css                      # Estilos globais (Tailwind)
```

## Modelo de Dados (Firestore)

| Coleção | Descrição |
|---------|-----------|
| `users` | Perfis de usuários e estatísticas de uso |
| `patients` | Pacientes (familiares) cadastrados por usuário |
| `documents` | Documentos médicos com metadados extraídos |
| `familyGroups` | Grupos familiares para compartilhamento |
| `familyMembers` | Membros e convites de grupos familiares |

## Design System

| Elemento | Especificação |
|----------|---------------|
| Cor Primária | Teal #14B8A6 |
| Sucesso | Verde #10B981 |
| Erro | Vermelho #EF4444 |
| Fonte | Inter, 16px base |
| Espaçamento | Grid 8px |
| Border Radius | 8-12px |

## Responsividade

- **Desktop (1024px+)**: Sidebar fixa, 4 colunas
- **Tablet (768-1023px)**: Sidebar colapsável, 2 colunas
- **Mobile (<768px)**: Menu hambúrguer, 1 coluna

## Scripts Disponíveis

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run preview  # Preview do build
npm run lint     # Verificar código
```

## Licença

MIT License - Consulte [LICENSE](LICENSE) para detalhes.

## Contribuindo

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request
