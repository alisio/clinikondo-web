import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const location = useLocation()

  // Mostrar mensagem de sucesso se vier do registro
  useEffect(() => {
    if (location.state?.message) {
      toast.success(location.state.message)
    }
  }, [location.state])

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Preencha todos os campos')
      return
    }

    try {
      setLoading(true)
      await login(email, password)
      toast.success('Bem-vindo de volta!')
    } catch (error) {
      console.error('Erro no login:', error)
      
      // Mensagens de erro amigáveis
      const errorMessages = {
        'auth/user-not-found': 'Usuário não encontrado',
        'auth/wrong-password': 'Senha incorreta',
        'auth/invalid-email': 'Email inválido',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento.',
        'auth/invalid-credential': 'Credenciais inválidas',
      }
      
      toast.error(errorMessages[error.code] || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Entrar na sua conta</h2>
        <p className="text-gray-600 mt-2">
          Bem-vindo de volta! Acesse seus documentos médicos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="seu@email.com"
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-end">
          <Link 
            to="/reset-password" 
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Esqueceu a senha?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                  fill="none"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Entrando...
            </span>
          ) : (
            'Entrar'
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-gray-600">
          Não tem uma conta?{' '}
          <Link 
            to="/register" 
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  )
}
