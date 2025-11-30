// Serviço de Grupos Familiares (RF19, RF20)
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { db } from '../lib/firebase'

// Constantes
export const FAMILY_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
}

export const MEMBER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  REMOVED: 'removed'
}

export const MAX_FAMILY_MEMBERS = 10

// Descrições das permissões
export const ROLE_DESCRIPTIONS = {
  [FAMILY_ROLES.ADMIN]: 'Gerenciar grupo, convidar/remover membros, todas as permissões',
  [FAMILY_ROLES.EDITOR]: 'Upload, editar tags, vincular pacientes, editar metadados',
  [FAMILY_ROLES.VIEWER]: 'Visualizar e baixar documentos apenas'
}

// ============ FAMILY GROUPS ============

/**
 * Cria um novo grupo familiar (RF19)
 * O criador se torna automaticamente o administrador
 */
export async function createFamilyGroup(userId, groupName) {
  if (!groupName || groupName.trim().length < 3) {
    throw new Error('Nome do grupo deve ter pelo menos 3 caracteres')
  }

  const batch = writeBatch(db)

  // Criar o grupo
  const groupRef = doc(collection(db, 'familyGroups'))
  const group = {
    name: groupName.trim(),
    ownerId: userId,
    memberIds: [userId],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  batch.set(groupRef, group)

  // Criar registro do membro (admin)
  const memberRef = doc(collection(db, 'familyMembers'))
  const member = {
    groupId: groupRef.id,
    userId: userId,
    role: FAMILY_ROLES.ADMIN,
    invitedBy: userId, // Auto-convite
    invitedAt: serverTimestamp(),
    acceptedAt: serverTimestamp(),
    status: MEMBER_STATUS.ACTIVE,
  }
  batch.set(memberRef, member)

  await batch.commit()

  return { 
    id: groupRef.id, 
    ...group,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

/**
 * Busca grupo familiar do usuário
 * Um usuário pode pertencer a apenas um grupo familiar
 */
export async function getUserFamilyGroup(userId) {
  // Buscar membership ativo
  const memberQuery = query(
    collection(db, 'familyMembers'),
    where('userId', '==', userId),
    where('status', '==', MEMBER_STATUS.ACTIVE)
  )
  
  const memberSnapshot = await getDocs(memberQuery)
  
  if (memberSnapshot.empty) {
    return null
  }

  const membership = memberSnapshot.docs[0].data()
  const groupDoc = await getDoc(doc(db, 'familyGroups', membership.groupId))
  
  if (!groupDoc.exists()) {
    return null
  }

  return {
    id: groupDoc.id,
    ...groupDoc.data(),
    membership: {
      id: memberSnapshot.docs[0].id,
      ...membership
    }
  }
}

/**
 * Busca todos os membros de um grupo familiar
 */
export async function getFamilyMembers(groupId) {
  const q = query(
    collection(db, 'familyMembers'),
    where('groupId', '==', groupId),
    orderBy('invitedAt', 'asc')
  )
  
  const snapshot = await getDocs(q)
  const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  
  // Buscar dados dos usuários
  const enrichedMembers = await Promise.all(
    members.map(async (member) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', member.userId))
        if (userDoc.exists()) {
          return {
            ...member,
            user: {
              uid: userDoc.id,
              ...userDoc.data()
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao buscar usuário:', e)
      }
      return member
    })
  )
  
  return enrichedMembers
}

/**
 * Convida um novo membro para o grupo (RF19)
 * Apenas admins podem convidar
 */
export async function inviteFamilyMember(groupId, invitedByUserId, inviteeEmail, role = FAMILY_ROLES.VIEWER) {
  // Verificar se quem convida é admin
  const inviterMembership = await getMembershipByUserAndGroup(invitedByUserId, groupId)
  
  if (!inviterMembership || inviterMembership.role !== FAMILY_ROLES.ADMIN) {
    throw new Error('Apenas administradores podem convidar membros')
  }

  // Verificar limite de membros
  const currentMembers = await getFamilyMembers(groupId)
  const activeMembers = currentMembers.filter(m => m.status !== MEMBER_STATUS.REMOVED)
  
  if (activeMembers.length >= MAX_FAMILY_MEMBERS) {
    throw new Error(`Máximo de ${MAX_FAMILY_MEMBERS} membros por grupo familiar`)
  }

  // Buscar usuário pelo email
  const usersQuery = query(
    collection(db, 'users'),
    where('email', '==', inviteeEmail.toLowerCase().trim())
  )
  const usersSnapshot = await getDocs(usersQuery)
  
  if (usersSnapshot.empty) {
    throw new Error('Usuário não encontrado. O usuário deve ter uma conta no CliniKondo.')
  }

  const inviteeUser = usersSnapshot.docs[0]
  const inviteeUserId = inviteeUser.id

  // Verificar se já é membro
  const existingMember = currentMembers.find(m => m.userId === inviteeUserId)
  
  if (existingMember) {
    if (existingMember.status === MEMBER_STATUS.ACTIVE) {
      throw new Error('Este usuário já é membro do grupo')
    }
    if (existingMember.status === MEMBER_STATUS.PENDING) {
      throw new Error('Este usuário já tem um convite pendente')
    }
  }

  // Verificar se usuário já pertence a outro grupo
  const existingGroup = await getUserFamilyGroup(inviteeUserId)
  if (existingGroup && existingGroup.id !== groupId) {
    throw new Error('Este usuário já pertence a outro grupo familiar')
  }

  // Validar role
  if (!Object.values(FAMILY_ROLES).includes(role)) {
    throw new Error('Papel inválido')
  }

  // Criar convite
  const member = {
    groupId,
    userId: inviteeUserId,
    role,
    invitedBy: invitedByUserId,
    invitedAt: serverTimestamp(),
    acceptedAt: null,
    status: MEMBER_STATUS.PENDING,
  }

  const memberRef = await addDoc(collection(db, 'familyMembers'), member)
  
  return { 
    id: memberRef.id, 
    ...member, 
    inviteeEmail,
    inviteeName: inviteeUser.data().displayName || inviteeEmail
  }
}

/**
 * Aceita um convite de grupo familiar
 */
export async function acceptFamilyInvite(userId) {
  // Buscar convite pendente
  const pendingQuery = query(
    collection(db, 'familyMembers'),
    where('userId', '==', userId),
    where('status', '==', MEMBER_STATUS.PENDING)
  )
  
  const pendingSnapshot = await getDocs(pendingQuery)
  
  if (pendingSnapshot.empty) {
    throw new Error('Nenhum convite pendente encontrado')
  }

  const inviteDoc = pendingSnapshot.docs[0]
  const invite = inviteDoc.data()

  const batch = writeBatch(db)

  // Atualizar membro para ativo
  batch.update(inviteDoc.ref, {
    status: MEMBER_STATUS.ACTIVE,
    acceptedAt: serverTimestamp(),
  })

  // Adicionar userId ao array de memberIds do grupo
  const groupRef = doc(db, 'familyGroups', invite.groupId)
  batch.update(groupRef, {
    memberIds: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  })

  await batch.commit()

  return { groupId: invite.groupId }
}

/**
 * Recusa um convite de grupo familiar
 */
export async function declineFamilyInvite(userId) {
  const pendingQuery = query(
    collection(db, 'familyMembers'),
    where('userId', '==', userId),
    where('status', '==', MEMBER_STATUS.PENDING)
  )
  
  const pendingSnapshot = await getDocs(pendingQuery)
  
  if (pendingSnapshot.empty) {
    throw new Error('Nenhum convite pendente encontrado')
  }

  await deleteDoc(pendingSnapshot.docs[0].ref)
}

/**
 * Busca convites pendentes para um usuário
 */
export async function getPendingInvites(userId) {
  const pendingQuery = query(
    collection(db, 'familyMembers'),
    where('userId', '==', userId),
    where('status', '==', MEMBER_STATUS.PENDING)
  )
  
  const snapshot = await getDocs(pendingQuery)
  
  const invites = await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data()
      const groupDoc = await getDoc(doc(db, 'familyGroups', data.groupId))
      const inviterDoc = await getDoc(doc(db, 'users', data.invitedBy))
      
      return {
        id: docSnap.id,
        ...data,
        group: groupDoc.exists() ? { id: groupDoc.id, ...groupDoc.data() } : null,
        invitedByUser: inviterDoc.exists() ? inviterDoc.data() : null,
      }
    })
  )
  
  return invites
}

/**
 * Remove um membro do grupo (RF19)
 * Apenas admins podem remover
 */
export async function removeFamilyMember(groupId, adminUserId, memberUserId) {
  // Verificar se quem remove é admin
  const adminMembership = await getMembershipByUserAndGroup(adminUserId, groupId)
  
  if (!adminMembership || adminMembership.role !== FAMILY_ROLES.ADMIN) {
    throw new Error('Apenas administradores podem remover membros')
  }

  // Não pode remover a si mesmo se for o único admin
  if (adminUserId === memberUserId) {
    const members = await getFamilyMembers(groupId)
    const admins = members.filter(m => m.role === FAMILY_ROLES.ADMIN && m.status === MEMBER_STATUS.ACTIVE)
    
    if (admins.length === 1) {
      throw new Error('Não é possível remover o único administrador do grupo')
    }
  }

  // Buscar membership do membro a ser removido
  const membershipQuery = query(
    collection(db, 'familyMembers'),
    where('groupId', '==', groupId),
    where('userId', '==', memberUserId)
  )
  
  const membershipSnapshot = await getDocs(membershipQuery)
  
  if (membershipSnapshot.empty) {
    throw new Error('Membro não encontrado')
  }

  const batch = writeBatch(db)

  // Atualizar status para removido
  batch.update(membershipSnapshot.docs[0].ref, {
    status: MEMBER_STATUS.REMOVED,
  })

  // Remover do array de memberIds
  const groupRef = doc(db, 'familyGroups', groupId)
  batch.update(groupRef, {
    memberIds: arrayRemove(memberUserId),
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
}

/**
 * Sair do grupo familiar
 */
export async function leaveFamilyGroup(groupId, userId) {
  const membership = await getMembershipByUserAndGroup(userId, groupId)
  
  if (!membership) {
    throw new Error('Você não é membro deste grupo')
  }

  // Se for admin, verificar se há outros admins
  if (membership.role === FAMILY_ROLES.ADMIN) {
    const members = await getFamilyMembers(groupId)
    const admins = members.filter(m => m.role === FAMILY_ROLES.ADMIN && m.status === MEMBER_STATUS.ACTIVE)
    
    if (admins.length === 1) {
      throw new Error('Como único administrador, você precisa transferir a administração ou excluir o grupo')
    }
  }

  const membershipQuery = query(
    collection(db, 'familyMembers'),
    where('groupId', '==', groupId),
    where('userId', '==', userId)
  )
  
  const membershipSnapshot = await getDocs(membershipQuery)
  
  if (!membershipSnapshot.empty) {
    const batch = writeBatch(db)
    
    batch.update(membershipSnapshot.docs[0].ref, {
      status: MEMBER_STATUS.REMOVED,
    })

    const groupRef = doc(db, 'familyGroups', groupId)
    batch.update(groupRef, {
      memberIds: arrayRemove(userId),
      updatedAt: serverTimestamp(),
    })

    await batch.commit()
  }
}

/**
 * Atualiza o papel de um membro (RF19)
 */
export async function updateMemberRole(groupId, adminUserId, memberUserId, newRole) {
  // Verificar se quem atualiza é admin
  const adminMembership = await getMembershipByUserAndGroup(adminUserId, groupId)
  
  if (!adminMembership || adminMembership.role !== FAMILY_ROLES.ADMIN) {
    throw new Error('Apenas administradores podem alterar papéis')
  }

  // Não pode alterar próprio papel se for único admin
  if (adminUserId === memberUserId && newRole !== FAMILY_ROLES.ADMIN) {
    const members = await getFamilyMembers(groupId)
    const admins = members.filter(m => m.role === FAMILY_ROLES.ADMIN && m.status === MEMBER_STATUS.ACTIVE)
    
    if (admins.length === 1) {
      throw new Error('Não é possível rebaixar o único administrador')
    }
  }

  if (!Object.values(FAMILY_ROLES).includes(newRole)) {
    throw new Error('Papel inválido')
  }

  const membershipQuery = query(
    collection(db, 'familyMembers'),
    where('groupId', '==', groupId),
    where('userId', '==', memberUserId)
  )
  
  const membershipSnapshot = await getDocs(membershipQuery)
  
  if (membershipSnapshot.empty) {
    throw new Error('Membro não encontrado')
  }

  await updateDoc(membershipSnapshot.docs[0].ref, {
    role: newRole,
  })
}

/**
 * Exclui um grupo familiar completamente
 * Apenas o owner pode excluir
 */
export async function deleteFamilyGroup(groupId, userId) {
  const groupDoc = await getDoc(doc(db, 'familyGroups', groupId))
  
  if (!groupDoc.exists()) {
    throw new Error('Grupo não encontrado')
  }

  if (groupDoc.data().ownerId !== userId) {
    throw new Error('Apenas o criador do grupo pode excluí-lo')
  }

  // Excluir todos os membros
  const membersQuery = query(
    collection(db, 'familyMembers'),
    where('groupId', '==', groupId)
  )
  
  const membersSnapshot = await getDocs(membersQuery)
  
  const batch = writeBatch(db)
  
  membersSnapshot.docs.forEach(memberDoc => {
    batch.delete(memberDoc.ref)
  })
  
  batch.delete(doc(db, 'familyGroups', groupId))
  
  await batch.commit()
}

/**
 * Atualiza nome do grupo
 */
export async function updateFamilyGroupName(groupId, adminUserId, newName) {
  const adminMembership = await getMembershipByUserAndGroup(adminUserId, groupId)
  
  if (!adminMembership || adminMembership.role !== FAMILY_ROLES.ADMIN) {
    throw new Error('Apenas administradores podem renomear o grupo')
  }

  if (!newName || newName.trim().length < 3) {
    throw new Error('Nome do grupo deve ter pelo menos 3 caracteres')
  }

  await updateDoc(doc(db, 'familyGroups', groupId), {
    name: newName.trim(),
    updatedAt: serverTimestamp(),
  })
}

// ============ PATIENT SHARING (RF20) ============

/**
 * Atualiza configuração de compartilhamento de um paciente
 */
export async function updatePatientSharing(patientId, isShared) {
  const patientRef = doc(db, 'patients', patientId)
  
  await updateDoc(patientRef, {
    isShared: isShared,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Busca pacientes visíveis para um usuário considerando grupos familiares (RF20)
 * 
 * Regras de visibilidade:
 * 1. Pacientes próprios (userId === currentUser) sempre visíveis
 * 2. Pacientes de outros membros do grupo com isShared = true
 * 3. Paciente-Membro: se paciente representa o próprio usuário, sempre visível
 */
export async function getVisiblePatients(userId, familyGroup = null) {
  // Sempre buscar pacientes próprios
  const ownPatientsQuery = query(
    collection(db, 'patients'),
    where('userId', '==', userId),
    orderBy('name')
  )
  
  const ownPatientsSnapshot = await getDocs(ownPatientsQuery)
  const ownPatients = ownPatientsSnapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data(),
    isOwn: true 
  }))

  // Se não tem grupo familiar, retorna apenas os próprios
  if (!familyGroup) {
    return ownPatients
  }

  // Buscar pacientes compartilhados de outros membros do grupo
  const otherMemberIds = familyGroup.memberIds.filter(id => id !== userId)
  
  if (otherMemberIds.length === 0) {
    return ownPatients
  }

  // Buscar pacientes compartilhados dos outros membros
  const sharedPatients = []
  
  // Firestore limita 'in' a 30 valores, então dividimos em chunks
  const chunks = []
  for (let i = 0; i < otherMemberIds.length; i += 30) {
    chunks.push(otherMemberIds.slice(i, i + 30))
  }

  for (const chunk of chunks) {
    const sharedQuery = query(
      collection(db, 'patients'),
      where('userId', 'in', chunk),
      where('isShared', '==', true)
    )
    
    const sharedSnapshot = await getDocs(sharedQuery)
    sharedPatients.push(...sharedSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      isOwn: false,
      isShared: true
    })))
  }

  // Combinar e ordenar por nome
  const allPatients = [...ownPatients, ...sharedPatients]
  allPatients.sort((a, b) => a.name.localeCompare(b.name))

  return allPatients
}

/**
 * Verifica se usuário pode editar um paciente (RF20)
 */
export async function canEditPatient(userId, patientId, familyGroup = null) {
  const patientDoc = await getDoc(doc(db, 'patients', patientId))
  
  if (!patientDoc.exists()) {
    return false
  }

  const patient = patientDoc.data()

  // Dono sempre pode editar
  if (patient.userId === userId) {
    return true
  }

  // Se não tem grupo, não pode
  if (!familyGroup) {
    return false
  }

  // Verificar membership e permissões
  const membership = await getMembershipByUserAndGroup(userId, familyGroup.id)
  
  if (!membership || membership.status !== MEMBER_STATUS.ACTIVE) {
    return false
  }

  // Verificar se paciente é compartilhado
  if (!patient.isShared) {
    return false
  }

  // Viewer não pode editar
  if (membership.role === FAMILY_ROLES.VIEWER) {
    return false
  }

  return true
}

/**
 * Verifica se usuário pode gerenciar (upload/delete) um paciente (RF20)
 */
export async function canManagePatient(userId, patientId, familyGroup = null) {
  const patientDoc = await getDoc(doc(db, 'patients', patientId))
  
  if (!patientDoc.exists()) {
    return false
  }

  const patient = patientDoc.data()

  // Dono sempre pode gerenciar
  if (patient.userId === userId) {
    return true
  }

  // Se não tem grupo, não pode
  if (!familyGroup) {
    return false
  }

  // Verificar membership e permissões
  const membership = await getMembershipByUserAndGroup(userId, familyGroup.id)
  
  if (!membership || membership.status !== MEMBER_STATUS.ACTIVE) {
    return false
  }

  // Verificar se paciente é compartilhado
  if (!patient.isShared) {
    return false
  }

  // Apenas admin pode gerenciar
  if (membership.role !== FAMILY_ROLES.ADMIN) {
    return false
  }

  return true
}

// ============ DOCUMENTS WITH SHARING (RF20) ============

/**
 * Busca documentos visíveis para um usuário considerando grupos familiares (RF20)
 * 
 * Regras de visibilidade de documentos:
 * 1. Documentos próprios (userId === currentUser) sempre visíveis
 * 2. Documentos vinculados a pacientes compartilhados (isShared = true) de outros membros
 * 3. Documentos não vinculados a paciente são privados (só o dono vê)
 */
export async function getDocumentsWithShared(userId, familyGroup = null) {
  // 1. Sempre buscar documentos próprios
  const ownDocsQuery = query(
    collection(db, 'documents'),
    where('userId', '==', userId),
    orderBy('uploadedAt', 'desc')
  )
  
  const ownDocsSnapshot = await getDocs(ownDocsQuery)
  const ownDocuments = ownDocsSnapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data(),
    isOwn: true 
  }))

  // Se não tem grupo familiar, retorna apenas os próprios
  if (!familyGroup) {
    return ownDocuments
  }

  // 2. Buscar IDs dos pacientes compartilhados de outros membros do grupo
  const otherMemberIds = familyGroup.memberIds.filter(id => id !== userId)
  
  if (otherMemberIds.length === 0) {
    return ownDocuments
  }

  // Buscar pacientes compartilhados dos outros membros
  const sharedPatientIds = []
  
  // Firestore limita 'in' a 30 valores, então dividimos em chunks
  const memberChunks = []
  for (let i = 0; i < otherMemberIds.length; i += 30) {
    memberChunks.push(otherMemberIds.slice(i, i + 30))
  }

  for (const chunk of memberChunks) {
    const sharedPatientsQuery = query(
      collection(db, 'patients'),
      where('userId', 'in', chunk),
      where('isShared', '==', true)
    )
    
    const sharedPatientsSnapshot = await getDocs(sharedPatientsQuery)
    sharedPatientIds.push(...sharedPatientsSnapshot.docs.map(doc => doc.id))
  }

  // Se não há pacientes compartilhados, retorna apenas os próprios
  if (sharedPatientIds.length === 0) {
    return ownDocuments
  }

  // 3. Buscar documentos vinculados a pacientes compartilhados
  const sharedDocuments = []
  
  // Dividir patientIds em chunks de 30 (limite do Firestore para 'in')
  const patientChunks = []
  for (let i = 0; i < sharedPatientIds.length; i += 30) {
    patientChunks.push(sharedPatientIds.slice(i, i + 30))
  }

  for (const chunk of patientChunks) {
    const sharedDocsQuery = query(
      collection(db, 'documents'),
      where('patientId', 'in', chunk),
      orderBy('uploadedAt', 'desc')
    )
    
    const sharedDocsSnapshot = await getDocs(sharedDocsQuery)
    
    // Filtrar para não duplicar documentos próprios
    const newDocs = sharedDocsSnapshot.docs
      .filter(docSnap => docSnap.data().userId !== userId)
      .map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        isOwn: false,
        isShared: true
      }))
    
    sharedDocuments.push(...newDocs)
  }

  // 4. Combinar e ordenar por data de upload
  const allDocuments = [...ownDocuments, ...sharedDocuments]
  allDocuments.sort((a, b) => {
    const dateA = a.uploadedAt?.toDate?.() || new Date(a.uploadedAt) || new Date(0)
    const dateB = b.uploadedAt?.toDate?.() || new Date(b.uploadedAt) || new Date(0)
    return dateB - dateA
  })

  return allDocuments
}

// ============ HELPERS ============

/**
 * Busca membership específica de usuário em um grupo
 */
async function getMembershipByUserAndGroup(userId, groupId) {
  const q = query(
    collection(db, 'familyMembers'),
    where('groupId', '==', groupId),
    where('userId', '==', userId),
    where('status', '==', MEMBER_STATUS.ACTIVE)
  )
  
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) {
    return null
  }

  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
}

/**
 * Verifica se usuário tem permissão específica no grupo
 */
export async function hasPermission(userId, groupId, requiredRole) {
  const membership = await getMembershipByUserAndGroup(userId, groupId)
  
  if (!membership) {
    return false
  }

  const roleHierarchy = {
    [FAMILY_ROLES.ADMIN]: 3,
    [FAMILY_ROLES.EDITOR]: 2,
    [FAMILY_ROLES.VIEWER]: 1,
  }

  return roleHierarchy[membership.role] >= roleHierarchy[requiredRole]
}
