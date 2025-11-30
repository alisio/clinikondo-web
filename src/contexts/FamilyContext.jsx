import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import {
  getUserFamilyGroup,
  getFamilyMembers,
  getPendingInvites,
  createFamilyGroup,
  inviteFamilyMember,
  acceptFamilyInvite,
  declineFamilyInvite,
  removeFamilyMember,
  leaveFamilyGroup,
  updateMemberRole,
  deleteFamilyGroup,
  updateFamilyGroupName,
  FAMILY_ROLES,
  MEMBER_STATUS,
} from '../services/familyService'

const FamilyContext = createContext(null)

export function useFamily() {
  const context = useContext(FamilyContext)
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider')
  }
  return context
}

export function FamilyProvider({ children }) {
  const { user } = useAuth()
  const [familyGroup, setFamilyGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Carregar grupo familiar do usuário
  const loadFamilyData = useCallback(async () => {
    if (!user) {
      setFamilyGroup(null)
      setMembers([])
      setPendingInvites([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Carregar grupo e convites em paralelo
      const [group, invites] = await Promise.all([
        getUserFamilyGroup(user.uid),
        getPendingInvites(user.uid),
      ])

      setFamilyGroup(group)
      setPendingInvites(invites)

      // Se tem grupo, carregar membros
      if (group) {
        const groupMembers = await getFamilyMembers(group.id)
        setMembers(groupMembers)
      } else {
        setMembers([])
      }
    } catch (err) {
      console.error('Erro ao carregar dados de família:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadFamilyData()
  }, [loadFamilyData])

  // Verificar se usuário é admin do grupo
  const isAdmin = familyGroup?.membership?.role === FAMILY_ROLES.ADMIN

  // Verificar se usuário pode editar (admin ou editor)
  const canEdit = familyGroup?.membership?.role === FAMILY_ROLES.ADMIN ||
                  familyGroup?.membership?.role === FAMILY_ROLES.EDITOR

  // Verificar se usuário é o dono do grupo
  const isOwner = familyGroup?.ownerId === user?.uid

  // ============ AÇÕES ============

  // Criar novo grupo familiar
  async function handleCreateGroup(name) {
    if (!user) throw new Error('Usuário não autenticado')
    
    const group = await createFamilyGroup(user.uid, name)
    await loadFamilyData()
    return group
  }

  // Convidar membro
  async function handleInviteMember(email, role = FAMILY_ROLES.VIEWER) {
    if (!familyGroup) throw new Error('Você não pertence a um grupo familiar')
    if (!isAdmin) throw new Error('Apenas administradores podem convidar')

    const invite = await inviteFamilyMember(familyGroup.id, user.uid, email, role)
    await loadFamilyData()
    return invite
  }

  // Aceitar convite
  async function handleAcceptInvite() {
    if (!user) throw new Error('Usuário não autenticado')
    
    const result = await acceptFamilyInvite(user.uid)
    await loadFamilyData()
    return result
  }

  // Recusar convite
  async function handleDeclineInvite() {
    if (!user) throw new Error('Usuário não autenticado')
    
    await declineFamilyInvite(user.uid)
    await loadFamilyData()
  }

  // Remover membro
  async function handleRemoveMember(memberUserId) {
    if (!familyGroup) throw new Error('Você não pertence a um grupo familiar')
    if (!isAdmin) throw new Error('Apenas administradores podem remover membros')

    await removeFamilyMember(familyGroup.id, user.uid, memberUserId)
    await loadFamilyData()
  }

  // Sair do grupo
  async function handleLeaveGroup() {
    if (!familyGroup) throw new Error('Você não pertence a um grupo familiar')

    await leaveFamilyGroup(familyGroup.id, user.uid)
    await loadFamilyData()
  }

  // Atualizar papel de membro
  async function handleUpdateMemberRole(memberUserId, newRole) {
    if (!familyGroup) throw new Error('Você não pertence a um grupo familiar')
    if (!isAdmin) throw new Error('Apenas administradores podem alterar papéis')

    await updateMemberRole(familyGroup.id, user.uid, memberUserId, newRole)
    await loadFamilyData()
  }

  // Excluir grupo
  async function handleDeleteGroup() {
    if (!familyGroup) throw new Error('Você não pertence a um grupo familiar')
    if (!isOwner) throw new Error('Apenas o criador pode excluir o grupo')

    await deleteFamilyGroup(familyGroup.id, user.uid)
    await loadFamilyData()
  }

  // Renomear grupo
  async function handleRenameGroup(newName) {
    if (!familyGroup) throw new Error('Você não pertence a um grupo familiar')
    if (!isAdmin) throw new Error('Apenas administradores podem renomear')

    await updateFamilyGroupName(familyGroup.id, user.uid, newName)
    await loadFamilyData()
  }

  // Recarregar dados
  async function refresh() {
    await loadFamilyData()
  }

  const value = {
    // Estado
    familyGroup,
    members,
    pendingInvites,
    loading,
    error,

    // Permissões
    isAdmin,
    canEdit,
    isOwner,
    hasGroup: !!familyGroup,
    hasPendingInvite: pendingInvites.length > 0,

    // Ações
    createGroup: handleCreateGroup,
    inviteMember: handleInviteMember,
    acceptInvite: handleAcceptInvite,
    declineInvite: handleDeclineInvite,
    removeMember: handleRemoveMember,
    leaveGroup: handleLeaveGroup,
    updateMemberRole: handleUpdateMemberRole,
    deleteGroup: handleDeleteGroup,
    renameGroup: handleRenameGroup,
    refresh,

    // Constantes exportadas
    FAMILY_ROLES,
    MEMBER_STATUS,
  }

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  )
}
