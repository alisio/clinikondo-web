import { useState } from 'react'
import { useFamily } from '../contexts/FamilyContext'
import { FAMILY_ROLES, ROLE_DESCRIPTIONS } from '../services/familyService'
import {
  Users,
  UserPlus,
  Crown,
  Edit2,
  Trash2,
  LogOut,
  Check,
  X,
  Mail,
  Shield,
  Eye,
  Pencil,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react'
import Modal from './ui/Modal'
import Spinner from './ui/Spinner'
import toast from 'react-hot-toast'

// Ícones e labels de roles
const ROLE_CONFIG = {
  [FAMILY_ROLES.ADMIN]: { 
    icon: Crown, 
    label: 'Administrador', 
    color: 'text-amber-600 bg-amber-50',
    shortLabel: 'Admin'
  },
  [FAMILY_ROLES.EDITOR]: { 
    icon: Pencil, 
    label: 'Editor', 
    color: 'text-blue-600 bg-blue-50',
    shortLabel: 'Editor'
  },
  [FAMILY_ROLES.VIEWER]: { 
    icon: Eye, 
    label: 'Visualizador', 
    color: 'text-gray-600 bg-gray-50',
    shortLabel: 'Viewer'
  },
}

// Badge de papel
function RoleBadge({ role, size = 'md' }) {
  const config = ROLE_CONFIG[role]
  if (!config) return null

  const Icon = config.icon
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${config.color} ${sizeClasses}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {size === 'sm' ? config.shortLabel : config.label}
    </span>
  )
}

// Card de convite pendente
function PendingInviteCard({ invite, onAccept, onDecline, loading }) {
  return (
    <div className="card p-6 border-2 border-primary-200 bg-primary-50/50">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-full bg-primary-100">
          <Mail className="w-6 h-6 text-primary-600" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            Convite para Grupo Familiar
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium">{invite.invitedByUser?.displayName || 'Alguém'}</span>
            {' '}convidou você para participar do grupo{' '}
            <span className="font-medium">"{invite.group?.name}"</span>
          </p>
          
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-500">Papel:</span>
            <RoleBadge role={invite.role} size="sm" />
          </div>
          
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={onAccept}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? <Spinner size="sm" /> : <Check className="w-4 h-4" />}
              Aceitar
            </button>
            <button
              onClick={onDecline}
              disabled={loading}
              className="btn-secondary"
            >
              <X className="w-4 h-4" />
              Recusar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Card de membro
function MemberCard({ member, currentUserId, isAdmin, onRemove, onUpdateRole }) {
  const [showRoleSelect, setShowRoleSelect] = useState(false)
  const [newRole, setNewRole] = useState(member.role)
  const [loading, setLoading] = useState(false)

  const isCurrentUser = member.userId === currentUserId
  const isPending = member.status === 'pending'

  async function handleUpdateRole() {
    if (newRole === member.role) {
      setShowRoleSelect(false)
      return
    }

    setLoading(true)
    try {
      await onUpdateRole(member.userId, newRole)
      toast.success('Papel atualizado')
      setShowRoleSelect(false)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove() {
    if (!confirm(`Tem certeza que deseja remover ${member.user?.displayName || 'este membro'}?`)) {
      return
    }

    setLoading(true)
    try {
      await onRemove(member.userId)
      toast.success('Membro removido')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${
      isPending ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
          <span className="text-primary-600 font-medium">
            {(member.user?.displayName || member.user?.email || '?')[0].toUpperCase()}
          </span>
        </div>
        
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {member.user?.displayName || member.user?.email || 'Usuário'}
            </span>
            {isCurrentUser && (
              <span className="text-xs text-gray-500">(você)</span>
            )}
            {isPending && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
                <Clock className="w-3 h-3" />
                Pendente
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500">{member.user?.email}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {showRoleSelect ? (
          <div className="flex items-center gap-2">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="input py-1 text-sm"
              disabled={loading}
            >
              {Object.entries(ROLE_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>
            <button
              onClick={handleUpdateRole}
              disabled={loading}
              className="p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
            >
              {loading ? <Spinner size="sm" /> : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                setShowRoleSelect(false)
                setNewRole(member.role)
              }}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <RoleBadge role={member.role} size="sm" />
            
            {isAdmin && !isCurrentUser && !isPending && (
              <button
                onClick={() => setShowRoleSelect(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                title="Alterar papel"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            
            {isAdmin && !isCurrentUser && (
              <button
                onClick={handleRemove}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-error-50 text-error-600"
                title="Remover membro"
              >
                {loading ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Modal de convite
function InviteModal({ isOpen, onClose, onInvite }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState(FAMILY_ROLES.VIEWER)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error('Email é obrigatório')
      return
    }

    setLoading(true)
    try {
      await onInvite(email.trim(), role)
      toast.success('Convite enviado')
      setEmail('')
      setRole(FAMILY_ROLES.VIEWER)
      onClose()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convidar Membro" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Email do usuário</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="usuario@email.com"
            disabled={loading}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1">
            O usuário deve ter uma conta no CliniKondo
          </p>
        </div>

        <div>
          <label className="label">Papel no grupo</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="input"
            disabled={loading}
          >
            {Object.entries(ROLE_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {ROLE_DESCRIPTIONS[role]}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : <UserPlus className="w-4 h-4" />}
            Enviar Convite
          </button>
        </div>
      </form>
    </Modal>
  )
}

// Modal de criar grupo
function CreateGroupModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!name.trim() || name.trim().length < 3) {
      toast.error('Nome deve ter pelo menos 3 caracteres')
      return
    }

    setLoading(true)
    try {
      await onCreate(name.trim())
      toast.success('Grupo criado com sucesso!')
      setName('')
      onClose()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Criar Grupo Familiar" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nome do Grupo</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Ex: Família Silva"
            disabled={loading}
            autoFocus
          />
        </div>

        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <h4 className="font-medium text-blue-900 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Você será o Administrador
          </h4>
          <p className="text-sm text-blue-700 mt-1">
            Como criador do grupo, você poderá convidar membros, definir papéis e gerenciar o compartilhamento.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : <Users className="w-4 h-4" />}
            Criar Grupo
          </button>
        </div>
      </form>
    </Modal>
  )
}

// Componente principal
export default function FamilyGroupManager() {
  const {
    familyGroup,
    members,
    pendingInvites,
    loading,
    isAdmin,
    isOwner,
    hasGroup,
    hasPendingInvite,
    createGroup,
    inviteMember,
    acceptInvite,
    declineInvite,
    removeMember,
    leaveGroup,
    updateMemberRole,
    deleteGroup,
    renameGroup,
    refresh,
  } = useFamily()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Aceitar/Recusar convite
  async function handleAcceptInvite() {
    setActionLoading(true)
    try {
      await acceptInvite()
      toast.success('Você agora faz parte do grupo!')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeclineInvite() {
    if (!confirm('Tem certeza que deseja recusar este convite?')) return
    
    setActionLoading(true)
    try {
      await declineInvite()
      toast.success('Convite recusado')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Sair do grupo
  async function handleLeaveGroup() {
    if (!confirm('Tem certeza que deseja sair do grupo familiar?')) return
    
    setActionLoading(true)
    try {
      await leaveGroup()
      toast.success('Você saiu do grupo')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Excluir grupo
  async function handleDeleteGroup() {
    if (!confirm('Tem certeza que deseja EXCLUIR o grupo? Esta ação não pode ser desfeita e todos os membros perderão acesso.')) return
    
    setActionLoading(true)
    try {
      await deleteGroup()
      toast.success('Grupo excluído')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  // Renomear grupo
  async function handleRenameGroup() {
    if (!newGroupName.trim() || newGroupName.trim().length < 3) {
      toast.error('Nome deve ter pelo menos 3 caracteres')
      return
    }

    setActionLoading(true)
    try {
      await renameGroup(newGroupName.trim())
      toast.success('Nome atualizado')
      setEditingName(false)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Convites pendentes */}
      {hasPendingInvite && pendingInvites.map(invite => (
        <PendingInviteCard
          key={invite.id}
          invite={invite}
          onAccept={handleAcceptInvite}
          onDecline={handleDeclineInvite}
          loading={actionLoading}
        />
      ))}

      {/* Sem grupo - opção de criar */}
      {!hasGroup && !hasPendingInvite && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary-600" />
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Grupo Familiar
          </h2>
          
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Crie um grupo familiar para compartilhar documentos médicos com cônjuge, filhos ou outros familiares. 
            Cada membro mantém sua própria conta e você controla o que é compartilhado.
          </p>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Users className="w-5 h-5" />
            Criar Grupo Familiar
          </button>
        </div>
      )}

      {/* Com grupo - gerenciamento */}
      {hasGroup && (
        <>
          {/* Header do grupo */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary-100">
                  <Users className="w-6 h-6 text-primary-600" />
                </div>
                
                <div>
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="input py-1"
                        autoFocus
                      />
                      <button
                        onClick={handleRenameGroup}
                        disabled={actionLoading}
                        className="p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
                      >
                        {actionLoading ? <Spinner size="sm" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingName(false)}
                        className="p-1.5 rounded-lg hover:bg-gray-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {familyGroup.name}
                      </h2>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setNewGroupName(familyGroup.name)
                            setEditingName(true)
                          }}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-gray-500">
                    {members.filter(m => m.status === 'active').length} membros ativos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={refresh}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  title="Atualizar"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                
                {isAdmin && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="btn-primary"
                  >
                    <UserPlus className="w-4 h-4" />
                    Convidar
                  </button>
                )}
              </div>
            </div>

            {/* Legenda de papéis */}
            <div className="p-4 rounded-lg bg-gray-50 mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Papéis e Permissões:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                  <div key={role} className="flex items-start gap-2">
                    <RoleBadge role={role} size="sm" />
                    <span className="text-gray-600 text-xs">
                      {ROLE_DESCRIPTIONS[role]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lista de membros */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Membros:</h4>
              {members.map(member => (
                <MemberCard
                  key={member.id}
                  member={member}
                  currentUserId={familyGroup.membership?.userId}
                  isAdmin={isAdmin}
                  onRemove={removeMember}
                  onUpdateRole={updateMemberRole}
                />
              ))}
            </div>
          </div>

          {/* Ações do grupo */}
          <div className="card p-6">
            <h3 className="font-medium text-gray-900 mb-4">Ações do Grupo</h3>
            
            <div className="flex flex-wrap gap-3">
              {!isOwner && (
                <button
                  onClick={handleLeaveGroup}
                  disabled={actionLoading}
                  className="btn-secondary text-error-600 hover:bg-error-50"
                >
                  {actionLoading ? <Spinner size="sm" /> : <LogOut className="w-4 h-4" />}
                  Sair do Grupo
                </button>
              )}
              
              {isOwner && (
                <button
                  onClick={handleDeleteGroup}
                  disabled={actionLoading}
                  className="btn-secondary text-error-600 hover:bg-error-50"
                >
                  {actionLoading ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                  Excluir Grupo
                </button>
              )}
            </div>

            {isOwner && (
              <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <p className="text-sm text-yellow-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Como criador do grupo, você não pode sair. Para deixar o grupo, exclua-o ou transfira a administração.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modais */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createGroup}
      />

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={inviteMember}
      />
    </div>
  )
}
