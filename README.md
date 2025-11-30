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
- **Busca Global**: Barra de busca centralizada no header com navegação automática
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

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

## Regras de Segurança (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuários só acessam seus próprios dados
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /patients/{patientId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.userId;
    }
    
    match /documents/{documentId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## Estrutura do Projeto

```
src/
├── components/         # Componentes reutilizáveis
│   ├── SearchBar.jsx   # Barra de busca global (header)
│   ├── PatientMatchModal.jsx  # Modal de vinculação de pacientes
│   ├── TagManager.jsx  # Gerenciador de tags (RF18)
│   └── ui/            # UI primitives
│       ├── Modal.jsx
│       ├── Spinner.jsx
│       ├── EmptyState.jsx
│       └── LoadingScreen.jsx
├── contexts/          # React Context
│   ├── AuthContext.jsx
│   ├── ProcessingContext.jsx
│   └── SearchContext.jsx  # Contexto de busca global
├── layouts/           # Layouts de página
│   ├── AuthLayout.jsx
│   └── MainLayout.jsx
├── lib/               # Utilitários e configurações
│   ├── firebase.js    # Config Firebase
│   ├── constants.js   # Constantes (MEDICAL_SYNONYMS, tipos de doc, etc)
│   └── utils.js       # Funções utilitárias
├── pages/             # Páginas da aplicação
│   ├── auth/          # Login, Registro, Reset
│   ├── DashboardPage.jsx
│   ├── ProcessorPage.jsx
│   ├── PatientsPage.jsx
│   └── FilesPage.jsx
├── services/          # Serviços (Firestore, AI, Extraction)
│   ├── aiService.js   # Classificação por IA e extração de tags (RF16)
│   ├── extractionService.js  # Extração de texto de PDFs
│   └── firestoreService.js   # Operações Firestore
├── App.jsx            # Router principal
├── main.jsx           # Entry point
└── index.css          # Estilos globais (Tailwind)
```

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
