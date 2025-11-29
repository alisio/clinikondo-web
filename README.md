# CliniKondo Web Edition 🏥✨

Plataforma de organização médica pessoal que transforma arquivos digitais desorganizados em um arquivo digital estruturado, pesquisável e seguro usando Inteligência Artificial.

## 🚀 Funcionalidades

- **Upload Inteligente**: Arraste e solte PDFs, JPGs e PNGs
- **Classificação por IA**: Identifica automaticamente tipo, especialidade e data do documento
- **Reconhecimento de Pacientes**: Vincula documentos a familiares usando fuzzy matching
- **Busca Avançada**: Filtre por tipo, especialidade, paciente ou texto extraído
- **Organização Hierárquica**: Visualize documentos agrupados por paciente
- **Download Padronizado**: Arquivos renomeados no formato `AAAA-MM-DD-paciente-tipo-especialidade.ext`

## 📦 Stack Tecnológico

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Autenticação**: Firebase Auth
- **Banco de Dados**: Firestore
- **Storage**: Firebase Storage
- **IA**: Integração com LLMs (DeepInfra/OpenAI)
- **PDF**: pdf.js para extração de texto
- **Ícones**: Lucide React

## 🛠️ Instalação

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

## 🔒 Regras de Segurança (Firestore)

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

## 📁 Estrutura do Projeto

```
src/
├── components/         # Componentes reutilizáveis
│   └── ui/            # UI primitives (Modal, Spinner, etc)
├── contexts/          # React Context (Auth, Processing)
├── layouts/           # Layouts de página
├── lib/               # Utilitários e configurações
│   ├── firebase.js    # Config Firebase
│   ├── constants.js   # Constantes da aplicação
│   └── utils.js       # Funções utilitárias
├── pages/             # Páginas da aplicação
│   ├── auth/          # Login, Registro, Reset
│   ├── DashboardPage.jsx
│   ├── ProcessorPage.jsx
│   ├── PatientsPage.jsx
│   └── FilesPage.jsx
├── services/          # Serviços (Firestore, AI, Extraction)
├── App.jsx            # Router principal
├── main.jsx           # Entry point
└── index.css          # Estilos globais (Tailwind)
```

## 🎨 Design System

| Elemento | Especificação |
|----------|---------------|
| Cor Primária | Teal #14B8A6 |
| Sucesso | Verde #10B981 |
| Erro | Vermelho #EF4444 |
| Fonte | Inter, 16px base |
| Espaçamento | Grid 8px |
| Border Radius | 8-12px |

## 📱 Responsividade

- **Desktop (1024px+)**: Sidebar fixa, 4 colunas
- **Tablet (768-1023px)**: Sidebar colapsável, 2 colunas
- **Mobile (<768px)**: Menu hambúrguer, 1 coluna

## 🧪 Scripts Disponíveis

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run preview  # Preview do build
npm run lint     # Verificar código
```

## 📄 Licença

MIT License - Veja [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

Desenvolvido com ❤️ para organizar a saúde da sua família.
# clinikondo-web
