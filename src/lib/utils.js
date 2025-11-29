// Utilitários gerais
import Fuse from 'fuse.js'

/**
 * Gera um slug a partir de um nome
 * Ex: "Maria Silva" -> "maria_silva"
 */
export function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Formata bytes para tamanho legível
 * Ex: 1024 -> "1 KB"
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Formata data para exibição
 */
export function formatDate(date, options = {}) {
  if (!date) return ''
  
  const d = date instanceof Date ? date : new Date(date)
  
  const defaultOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }
  
  return d.toLocaleDateString('pt-BR', defaultOptions)
}

/**
 * Formata data para ISO (AAAA-MM-DD)
 */
export function formatDateISO(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return d.toISOString().split('T')[0]
}

/**
 * Gera nome padronizado do documento (RN01)
 * Formato: AAAA-MM-DD-slug_paciente-tipo-especialidade.ext
 */
export function generateFinalName(doc) {
  const { date, patientSlug, type, specialty, originalName } = doc
  const ext = originalName.split('.').pop().toLowerCase()
  const dateStr = formatDateISO(date || new Date())
  const slug = patientSlug || 'sem_paciente'
  const typeStr = type?.toLowerCase() || 'documento'
  const specStr = specialty?.toLowerCase().replace(/\s+/g, '_') || 'geral'
  
  return `${dateStr}-${slug}-${typeStr}-${specStr}.${ext}`
}

/**
 * Fuzzy matching de nomes (RN02)
 * Retorna o melhor match com score >= threshold
 */
export function fuzzyMatchPatient(searchName, patients, threshold = 0.75) {
  if (!searchName || !patients?.length) return null
  
  // Prepara lista de busca incluindo aliases
  const searchList = patients.flatMap(patient => [
    { name: patient.name, patient, type: 'name' },
    ...(patient.aliases || []).map(alias => ({ 
      name: alias, 
      patient, 
      type: 'alias' 
    })),
  ])
  
  const fuse = new Fuse(searchList, {
    keys: ['name'],
    threshold: 1 - threshold, // Fuse usa threshold invertido
    includeScore: true,
  })
  
  const results = fuse.search(searchName)
  
  if (results.length === 0) return null
  
  const best = results[0]
  const score = 1 - best.score // Converte para 0-1
  
  if (score >= threshold) {
    return {
      patient: best.item.patient,
      matchedName: best.item.name,
      matchType: best.item.type,
      confidence: Math.round(score * 100),
    }
  }
  
  return null
}

/**
 * Encontra múltiplos possíveis matches
 */
export function findPossiblePatients(searchName, patients, minConfidence = 50) {
  if (!searchName || !patients?.length) return []
  
  const searchList = patients.flatMap(patient => [
    { name: patient.name, patient, type: 'name' },
    ...(patient.aliases || []).map(alias => ({ 
      name: alias, 
      patient, 
      type: 'alias' 
    })),
  ])
  
  const fuse = new Fuse(searchList, {
    keys: ['name'],
    threshold: 1 - (minConfidence / 100),
    includeScore: true,
  })
  
  const results = fuse.search(searchName)
  
  // Agrupa por paciente e pega o melhor match de cada
  const patientMatches = new Map()
  
  for (const result of results) {
    const patientId = result.item.patient.id
    const score = Math.round((1 - result.score) * 100)
    
    if (!patientMatches.has(patientId) || patientMatches.get(patientId).confidence < score) {
      patientMatches.set(patientId, {
        patient: result.item.patient,
        matchedName: result.item.name,
        matchType: result.item.type,
        confidence: score,
      })
    }
  }
  
  return Array.from(patientMatches.values())
    .sort((a, b) => b.confidence - a.confidence)
}

/**
 * Valida arquivo antes do upload (RN03)
 */
export function validateFile(file, maxSize = 50 * 1024 * 1024) {
  const errors = []
  
  // Verifica tamanho
  if (file.size > maxSize) {
    errors.push(`Arquivo muito grande (máx: ${formatFileSize(maxSize)})`)
  }
  
  // Verifica tipo
  const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
  if (!validTypes.includes(file.type)) {
    errors.push('Formato não suportado (aceita: PDF, JPG, PNG)')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Debounce para pesquisa
 */
export function debounce(fn, delay) {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Calcula ícone de confiança (estrelas)
 */
export function getConfidenceStars(confidence) {
  if (confidence >= 90) return '⭐⭐⭐⭐⭐'
  if (confidence >= 75) return '⭐⭐⭐⭐'
  if (confidence >= 60) return '⭐⭐⭐'
  if (confidence >= 40) return '⭐⭐'
  return '⭐'
}

/**
 * Retorna cor CSS baseada na confiança
 */
export function getConfidenceColor(confidence) {
  if (confidence >= 90) return 'text-success-600'
  if (confidence >= 75) return 'text-primary-600'
  if (confidence >= 50) return 'text-warning-600'
  return 'text-error-600'
}
