import { FileHeart } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="relative">
          <FileHeart className="w-16 h-16 text-primary-500 mx-auto animate-pulse" />
        </div>
        <p className="mt-4 text-gray-600">Carregando...</p>
      </div>
    </div>
  )
}
