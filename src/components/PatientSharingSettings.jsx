import { useState } from 'react'
import { useFamily } from '../contexts/FamilyContext'
import { updatePatientSharing } from '../services/familyService'
import { 
  Users, 
  Lock, 
  Unlock, 
  Eye,
  EyeOff,
  Info,
  AlertCircle 
} from 'lucide-react'
import Spinner from './ui/Spinner'
import toast from 'react-hot-toast'

/**
 * Componente de configuração de compartilhamento de paciente (RF20)
 * 
 * Permite ao dono de um paciente definir se ele será visível para
 * outros membros do grupo familiar ou privado.
 */
export default function PatientSharingSettings({ patient, onUpdate }) {
  const { hasGroup, familyGroup, members, canEdit } = useFamily()
  const [loading, setLoading] = useState(false)
  const [isShared, setIsShared] = useState(patient?.isShared ?? false)

  // Se não tem grupo familiar, não mostra controles de compartilhamento
  if (!hasGroup) {
    return (
      <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-sm text-gray-600">
              Este paciente é privado (visível apenas para você).
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Crie um grupo familiar para compartilhar documentos com outros membros.
            </p>
          </div>
        </div>
      </div>
    )
  }

  async function handleToggleSharing() {
    setLoading(true)
    const newValue = !isShared

    try {
      await updatePatientSharing(patient.id, newValue)
      setIsShared(newValue)
      
      if (onUpdate) {
        onUpdate({ ...patient, isShared: newValue })
      }

      toast.success(
        newValue 
          ? 'Paciente agora é visível para o grupo' 
          : 'Paciente agora é privado'
      )
    } catch (error) {
      toast.error(error.message || 'Erro ao atualizar compartilhamento')
    } finally {
      setLoading(false)
    }
  }

  // Contar membros que podem ver (excluindo o dono)
  const otherMembersCount = members.filter(
    m => m.userId !== patient.userId && m.status === 'active'
  ).length

  return (
    <div className="space-y-4">
      {/* Toggle de compartilhamento */}
      <div className={`p-4 rounded-lg border-2 transition-colors ${
        isShared 
          ? 'bg-primary-50 border-primary-200' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isShared ? (
              <div className="p-2 rounded-full bg-primary-100">
                <Unlock className="w-5 h-5 text-primary-600" />
              </div>
            ) : (
              <div className="p-2 rounded-full bg-gray-100">
                <Lock className="w-5 h-5 text-gray-600" />
              </div>
            )}
            
            <div>
              <h4 className="font-medium text-gray-900">
                {isShared ? 'Compartilhado com o grupo' : 'Privado'}
              </h4>
              <p className="text-sm text-gray-600">
                {isShared 
                  ? `Visível para ${otherMembersCount} membro(s) do grupo`
                  : 'Visível apenas para você'
                }
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleSharing}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isShared ? 'bg-primary-500' : 'bg-gray-300'
            }`}
          >
            <span className="sr-only">
              {isShared ? 'Tornar privado' : 'Compartilhar'}
            </span>
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isShared ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
            {loading && (
              <span className="absolute inset-0 flex items-center justify-center">
                <Spinner size="sm" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Info sobre visibilidade */}
      {isShared && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <h5 className="text-sm font-medium text-blue-900 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Quem pode ver
          </h5>
          <ul className="mt-2 text-sm text-blue-800 space-y-1">
            <li className="flex items-center gap-2">
              <Eye className="w-3 h-3" />
              <strong>Visualizadores:</strong> podem ver e baixar documentos
            </li>
            <li className="flex items-center gap-2">
              <Eye className="w-3 h-3" />
              <strong>Editores:</strong> podem editar tags e metadados
            </li>
            <li className="flex items-center gap-2">
              <Eye className="w-3 h-3" />
              <strong>Administradores:</strong> podem fazer upload e excluir
            </li>
          </ul>
        </div>
      )}

      {/* Membros do grupo */}
      {isShared && otherMembersCount > 0 && (
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
          <h5 className="text-sm font-medium text-gray-700 mb-2">
            Membros com acesso:
          </h5>
          <div className="flex flex-wrap gap-2">
            {members
              .filter(m => m.userId !== patient.userId && m.status === 'active')
              .map(member => (
                <span 
                  key={member.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border text-sm"
                >
                  <span className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-xs text-primary-600">
                    {(member.user?.displayName || member.user?.email || '?')[0].toUpperCase()}
                  </span>
                  {member.user?.displayName || member.user?.email}
                </span>
              ))
            }
          </div>
        </div>
      )}

      {/* Aviso sobre documentos */}
      <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
        <p className="text-sm text-yellow-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Importante:</strong> Os documentos seguem a visibilidade do paciente. 
            {isShared 
              ? ' Todos os documentos deste paciente serão visíveis para o grupo.'
              : ' Documentos deste paciente permanecerão privados.'
            }
          </span>
        </p>
      </div>
    </div>
  )
}

/**
 * Badge de status de compartilhamento (para usar em cards/listas)
 */
export function SharingBadge({ isShared, size = 'md' }) {
  const sizeClasses = size === 'sm' 
    ? 'px-1.5 py-0.5 text-xs gap-1' 
    : 'px-2 py-1 text-sm gap-1.5'

  if (isShared) {
    return (
      <span className={`inline-flex items-center rounded-full bg-primary-50 text-primary-700 ${sizeClasses}`}>
        <Users className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        Compartilhado
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center rounded-full bg-gray-100 text-gray-600 ${sizeClasses}`}>
      <Lock className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      Privado
    </span>
  )
}
