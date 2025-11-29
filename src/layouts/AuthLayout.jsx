import { Outlet } from 'react-router-dom'
import { FileHeart } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 to-primary-700 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 text-white">
            <FileHeart className="w-10 h-10" />
            <span className="text-2xl font-bold">CliniKondo</span>
          </div>
        </div>
        
        <div className="text-white">
          <h1 className="text-4xl font-bold mb-6">
            Organize seus documentos médicos com inteligência
          </h1>
          <p className="text-lg text-primary-100 leading-relaxed">
            Envie exames, receitas e laudos. Nossa IA classifica automaticamente, 
            identifica pacientes e organiza tudo para você encontrar quando precisar.
          </p>
          
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">6s</div>
              <div className="text-sm text-primary-200">Tempo médio de processamento</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">95%</div>
              <div className="text-sm text-primary-200">Precisão da IA</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm text-primary-200">Privacidade garantida</div>
            </div>
          </div>
        </div>

        <div className="text-primary-200 text-sm">
          © 2025 CliniKondo. Todos os direitos reservados.
        </div>
      </div>

      {/* Painel direito - Formulário */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8 text-primary-600">
            <FileHeart className="w-10 h-10" />
            <span className="text-2xl font-bold">CliniKondo</span>
          </div>
          
          <Outlet />
        </div>
      </div>
    </div>
  )
}
