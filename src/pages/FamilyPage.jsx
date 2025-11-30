import FamilyGroupManager from '../components/FamilyGroupManager'
import { useFamily } from '../contexts/FamilyContext'

export default function FamilyPage() {
  const { pendingInvites, hasGroup } = useFamily()

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Grupo Familiar
        </h1>
        <p className="text-gray-500 mt-1">
          {hasGroup 
            ? 'Gerencie os membros e permissões do seu grupo familiar'
            : 'Crie um grupo para compartilhar documentos médicos com sua família'
          }
        </p>
        
        {pendingInvites.length > 0 && (
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm">
            🔔 Você tem {pendingInvites.length} convite(s) pendente(s)
          </div>
        )}
      </div>

      {/* Gerenciador do grupo */}
      <FamilyGroupManager />
    </div>
  )
}
