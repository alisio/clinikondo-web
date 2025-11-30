// Serviço de Firestore para pacientes e documentos
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
  increment,
  writeBatch
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { generateSlug } from '../lib/utils'
import { normalizeTag, TAG_CONFIG } from '../lib/constants'

// ============ PATIENTS ============

/**
 * Busca todos os pacientes do usuário (RF02 - Isolamento de dados)
 */
export async function getPatients(userId) {
  const q = query(
    collection(db, 'patients'),
    where('userId', '==', userId),
    orderBy('name')
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

/**
 * Cria um novo paciente (RF04)
 */
export async function createPatient(userId, patientData) {
  const slug = generateSlug(patientData.name)
  
  // Verifica se slug já existe para este usuário
  const existingQuery = query(
    collection(db, 'patients'),
    where('userId', '==', userId),
    where('slug', '==', slug)
  )
  const existing = await getDocs(existingQuery)
  
  if (!existing.empty) {
    throw new Error('Já existe um paciente com nome similar')
  }
  
  const patient = {
    userId,
    name: patientData.name.trim(),
    slug,
    gender: patientData.gender,
    aliases: patientData.aliases || [],
    dateOfBirth: patientData.dateOfBirth || null,
    relationship: patientData.relationship || null,
    isShared: patientData.isShared ?? false, // RF20: Compartilhamento por paciente
    documentCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  
  const docRef = await addDoc(collection(db, 'patients'), patient)
  return { id: docRef.id, ...patient, isOwn: true }
}

/**
 * Atualiza um paciente
 */
export async function updatePatient(patientId, updates) {
  const docRef = doc(db, 'patients', patientId)
  
  // Se nome mudou, atualiza slug
  if (updates.name) {
    updates.slug = generateSlug(updates.name)
  }
  
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Adiciona alias a um paciente (RF05)
 */
export async function addPatientAlias(patientId, alias) {
  const docRef = doc(db, 'patients', patientId)
  const patientDoc = await getDoc(docRef)
  
  if (!patientDoc.exists()) {
    throw new Error('Paciente não encontrado')
  }
  
  const currentAliases = patientDoc.data().aliases || []
  
  // Verifica duplicata
  if (currentAliases.includes(alias)) {
    throw new Error('Este apelido já existe')
  }
  
  // Limite de 10 aliases
  if (currentAliases.length >= 10) {
    throw new Error('Máximo de 10 apelidos por paciente')
  }
  
  await updateDoc(docRef, {
    aliases: [...currentAliases, alias],
    updatedAt: serverTimestamp(),
  })
}

/**
 * Remove alias de um paciente
 */
export async function removePatientAlias(patientId, alias) {
  const docRef = doc(db, 'patients', patientId)
  const patientDoc = await getDoc(docRef)
  
  if (!patientDoc.exists()) {
    throw new Error('Paciente não encontrado')
  }
  
  const currentAliases = patientDoc.data().aliases || []
  
  await updateDoc(docRef, {
    aliases: currentAliases.filter(a => a !== alias),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Deleta um paciente
 */
export async function deletePatient(patientId) {
  await deleteDoc(doc(db, 'patients', patientId))
}

// ============ DOCUMENTS ============

/**
 * Busca todos os documentos do usuário
 */
export async function getDocuments(userId, filters = {}) {
  let q = query(
    collection(db, 'documents'),
    where('userId', '==', userId),
    orderBy('uploadedAt', 'desc')
  )
  
  // Aplicar filtros adicionais se necessário
  // Nota: Firestore requer índices compostos para múltiplos where
  
  const snapshot = await getDocs(q)
  let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  
  // Filtros client-side (para evitar complexidade de índices)
  if (filters.patientId) {
    docs = docs.filter(d => d.patientId === filters.patientId)
  }
  if (filters.type) {
    docs = docs.filter(d => d.type === filters.type)
  }
  if (filters.status) {
    docs = docs.filter(d => d.status === filters.status)
  }
  
  return docs
}

/**
 * Cria um novo documento
 */
export async function createDocument(userId, file, metadata) {
  // Upload do arquivo
  const fileRef = ref(storage, `users/${userId}/documents/${Date.now()}_${file.name}`)
  await uploadBytes(fileRef, file)
  const fileUrl = await getDownloadURL(fileRef)
  
  const document = {
    userId,
    originalName: file.name,
    finalName: metadata.finalName || file.name,
    type: metadata.type || 'Outro',
    specialty: metadata.specialty || 'Geral',
    patientId: metadata.patientId || null,
    date: metadata.date || null,
    confidence: metadata.confidence || 0,
    status: 'completed',
    reviewRequired: metadata.confidence < 75,
    fileUrl,
    fileSize: file.size,
    filePath: fileRef.fullPath,
    extractedContent: metadata.extractedText || '',
    extractedMetadata: metadata.classification || {},
    tags: metadata.tags || [], // RF16: Tags extraídas automaticamente pela IA
    manualTags: [], // RF18: Tags adicionadas manualmente pelo usuário
    suggestedPatients: metadata.suggestedPatients || [],
    uploadedAt: serverTimestamp(),
    processedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  
  const docRef = await addDoc(collection(db, 'documents'), document)
  
  // Atualiza contador do usuário (ignora erro se documento não existir)
  try {
    await updateDoc(doc(db, 'users', userId), {
      documentCount: increment(1),
      storageUsedMB: increment(file.size / (1024 * 1024)),
    })
  } catch (error) {
    console.warn('Não foi possível atualizar contadores do usuário:', error.message)
  }
  
  // Se tem paciente vinculado, atualiza contador dele
  if (metadata.patientId) {
    await updateDoc(doc(db, 'patients', metadata.patientId), {
      documentCount: increment(1),
      updatedAt: serverTimestamp(),
    })
  }
  
  return { id: docRef.id, ...document, fileUrl }
}

/**
 * Atualiza um documento
 */
export async function updateDocument(documentId, updates) {
  const docRef = doc(db, 'documents', documentId)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Vincula documento a um paciente
 */
export async function linkDocumentToPatient(documentId, patientId, previousPatientId = null) {
  const batch = writeBatch(db)
  
  // Atualiza documento
  const docRef = doc(db, 'documents', documentId)
  batch.update(docRef, {
    patientId,
    updatedAt: serverTimestamp(),
  })
  
  // Incrementa contador do novo paciente
  if (patientId) {
    const newPatientRef = doc(db, 'patients', patientId)
    batch.update(newPatientRef, {
      documentCount: increment(1),
      updatedAt: serverTimestamp(),
    })
  }
  
  // Decrementa contador do paciente anterior
  if (previousPatientId) {
    const prevPatientRef = doc(db, 'patients', previousPatientId)
    batch.update(prevPatientRef, {
      documentCount: increment(-1),
      updatedAt: serverTimestamp(),
    })
  }
  
  await batch.commit()
}

/**
 * Deleta um documento
 */
export async function deleteDocument(userId, documentId) {
  const docRef = doc(db, 'documents', documentId)
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) {
    throw new Error('Documento não encontrado')
  }
  
  const docData = docSnap.data()
  
  // Deleta arquivo do Storage
  if (docData.filePath) {
    try {
      await deleteObject(ref(storage, docData.filePath))
    } catch (e) {
      console.warn('Erro ao deletar arquivo:', e)
    }
  }
  
  // Deleta documento
  await deleteDoc(docRef)
  
  // Atualiza contador do usuário
  await updateDoc(doc(db, 'users', userId), {
    documentCount: increment(-1),
    storageUsedMB: increment(-docData.fileSize / (1024 * 1024)),
  })
  
  // Se tinha paciente vinculado, atualiza contador
  if (docData.patientId) {
    await updateDoc(doc(db, 'patients', docData.patientId), {
      documentCount: increment(-1),
      updatedAt: serverTimestamp(),
    })
  }
}

/**
 * Busca estatísticas do usuário (RF13)
 */
export async function getUserStats(userId) {
  const [userDoc, docsSnapshot] = await Promise.all([
    getDoc(doc(db, 'users', userId)),
    getDocs(query(collection(db, 'documents'), where('userId', '==', userId))),
  ])
  
  const docs = docsSnapshot.docs.map(d => d.data())
  
  return {
    totalDocuments: docs.length,
    completedDocuments: docs.filter(d => d.status === 'completed').length,
    pendingDocuments: docs.filter(d => d.status === 'pending' || d.status === 'processing').length,
    errorDocuments: docs.filter(d => d.status === 'error').length,
    reviewRequired: docs.filter(d => d.reviewRequired).length,
    storageUsedMB: userDoc.data()?.storageUsedMB || 0,
  }
}

// ============ TAGS (RF18 - Gerenciamento Manual de Tags) ============

/**
 * Adiciona uma tag manual a um documento
 * @param {string} documentId - ID do documento
 * @param {string} tag - Tag a adicionar
 */
export async function addDocumentTag(documentId, tag) {
  const docRef = doc(db, 'documents', documentId)
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) {
    throw new Error('Documento não encontrado')
  }
  
  const docData = docSnap.data()
  const currentTags = docData.tags || []
  const currentManualTags = docData.manualTags || []
  const allTags = [...currentTags, ...currentManualTags]
  
  // Normaliza a tag
  const normalizedTag = normalizeTag(tag)
  
  // Validações
  if (!normalizedTag || normalizedTag.length < TAG_CONFIG.MIN_TAG_LENGTH) {
    throw new Error(`Tag deve ter no mínimo ${TAG_CONFIG.MIN_TAG_LENGTH} caracteres`)
  }
  
  if (normalizedTag.length > TAG_CONFIG.MAX_TAG_LENGTH) {
    throw new Error(`Tag deve ter no máximo ${TAG_CONFIG.MAX_TAG_LENGTH} caracteres`)
  }
  
  if (allTags.map(t => normalizeTag(t)).includes(normalizedTag)) {
    throw new Error('Esta tag já existe no documento')
  }
  
  if (allTags.length >= TAG_CONFIG.MAX_TAGS_PER_DOCUMENT) {
    throw new Error(`Máximo de ${TAG_CONFIG.MAX_TAGS_PER_DOCUMENT} tags por documento`)
  }
  
  await updateDoc(docRef, {
    manualTags: [...currentManualTags, normalizedTag],
    updatedAt: serverTimestamp(),
  })
  
  return normalizedTag
}

/**
 * Remove uma tag manual de um documento
 * @param {string} documentId - ID do documento
 * @param {string} tag - Tag a remover
 */
export async function removeDocumentTag(documentId, tag) {
  const docRef = doc(db, 'documents', documentId)
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) {
    throw new Error('Documento não encontrado')
  }
  
  const docData = docSnap.data()
  const currentManualTags = docData.manualTags || []
  const normalizedTag = normalizeTag(tag)
  
  // Só permite remover tags manuais
  if (!currentManualTags.map(t => normalizeTag(t)).includes(normalizedTag)) {
    throw new Error('Apenas tags manuais podem ser removidas')
  }
  
  await updateDoc(docRef, {
    manualTags: currentManualTags.filter(t => normalizeTag(t) !== normalizedTag),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Atualiza as tags automáticas de um documento (usada após reprocessamento)
 * @param {string} documentId - ID do documento
 * @param {string[]} tags - Novas tags automáticas
 */
export async function updateDocumentAutoTags(documentId, tags) {
  const docRef = doc(db, 'documents', documentId)
  
  const normalizedTags = tags
    .map(normalizeTag)
    .filter(t => t.length >= TAG_CONFIG.MIN_TAG_LENGTH && t.length <= TAG_CONFIG.MAX_TAG_LENGTH)
    .slice(0, 15) // Máximo 15 tags automáticas
  
  await updateDoc(docRef, {
    tags: [...new Set(normalizedTags)], // Remove duplicatas
    updatedAt: serverTimestamp(),
  })
}

/**
 * Obtém todas as tags de um documento (automáticas + manuais)
 * @param {Object} document - Documento
 * @returns {Object} - { autoTags: [], manualTags: [], allTags: [] }
 */
export function getDocumentTags(document) {
  const autoTags = document?.tags || []
  const manualTags = document?.manualTags || []
  
  return {
    autoTags,
    manualTags,
    allTags: [...autoTags, ...manualTags],
  }
}
