import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    
    // Validações
    if (!name || !email || !password || !confirmPassword) {
      toast.error('Preencha todos os campos')
      return
    }

    if (name.trim().length < 2) {
      toast.error('Nome deve ter pelo menos 2 caracteres')
      return
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    try {
      setLoading(true)
      await register(email, password, name.trim())
      toast.success('Conta criada com sucesso!')
      navigate('/', { state: { message: 'Bem-vindo ao CliniKondo!' } })
    } catch (error) {
      console.error('Erro no registro:', error)
      
      const errorMessages = {
        'auth/email-already-in-use': 'Este email já está cadastrado',
        'auth/invalid-email': 'Email inválido',
        'auth/weak-password': 'A senha é muito fraca',
      }
      
      toast.error(errorMessages[error.code] || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fadeIn">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Criar sua conta</h2>
        <p className="text-gray-600 mt-2">
          Comece a organizar seus documentos médicos hoje.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="label">
            Nome completo
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="João Silva"
            autoComplete="name"
            disabled={loading}
          />
        </div>

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
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Confirmar senha
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            placeholder="Digite novamente"
            autoComplete="new-password"
            disabled={loading}
          />
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
              Criando conta...
            </span>
          ) : (
            'Criar conta grátis'
          )}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-gray-600">
          Já tem uma conta?{' '}
          <Link 
            to="/login" 
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Fazer login
          </Link>
        </p>
      </div>

      <p className="mt-6 text-xs text-gray-500 text-center">
        Ao criar uma conta, você concorda com nossos{' '}
        <a href="#" className="text-primary-600 hover:underline">Termos de Uso</a>
        {' '}e{' '}
        <a href="#" className="text-primary-600 hover:underline">Política de Privacidade</a>.
      </p>
    </div>
  )
}
