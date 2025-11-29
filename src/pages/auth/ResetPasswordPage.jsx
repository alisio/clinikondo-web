import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { resetPassword } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!email) {
      toast.error('Digite seu email')
      return
    }

    try {
      setLoading(true)
      await resetPassword(email)
      setSent(true)
    } catch (error) {
      console.error('Erro ao resetar senha:', error)
      
      const errorMessages = {
        'auth/user-not-found': 'Nenhuma conta encontrada com este email',
        'auth/invalid-email': 'Email inválido',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento.',
      }
      
      toast.error(errorMessages[error.code] || 'Erro ao enviar email')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="animate-fadeIn text-center">
        <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-success-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Email enviado!
        </h2>
        
        <p className="text-gray-600 mb-8">
          Enviamos instruções para recuperar sua senha para{' '}
          <span className="font-medium text-gray-900">{email}</span>
        </p>

        <p className="text-sm text-gray-500 mb-8">
          Não recebeu? Verifique sua pasta de spam ou{' '}
          <button 
            onClick={() => setSent(false)}
            className="text-primary-600 hover:underline"
          >
            tente novamente
          </button>
        </p>

        <Link to="/login" className="btn-primary">
          Voltar para login
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      <Link 
        to="/login" 
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para login
      </Link>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Recuperar senha</h2>
        <p className="text-gray-600 mt-2">
          Digite seu email e enviaremos instruções para criar uma nova senha.
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
            autoFocus
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
              Enviando...
            </span>
          ) : (
            'Enviar instruções'
          )}
        </button>
      </form>
    </div>
  )
}
