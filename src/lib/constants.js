// Constantes do sistema
export const DOCUMENT_TYPES = [
  { value: 'exame', label: 'Exame', icon: '📄' },
  { value: 'receita', label: 'Receita', icon: '💊' },
  { value: 'laudo', label: 'Laudo', icon: '🩺' },
  { value: 'vacina', label: 'Vacina', icon: '💉' },
  { value: 'outro', label: 'Outro', icon: '📋' },
]

export const SPECIALTIES = [
  'Cardiologia',
  'Dermatologia',
  'Endocrinologia',
  'Gastroenterologia',
  'Ginecologia',
  'Neurologia',
  'Oftalmologia',
  'Ortopedia',
  'Otorrinolaringologia',
  'Pediatria',
  'Pneumologia',
  'Psiquiatria',
  'Urologia',
  'Clínico Geral',
  'Outro',
]

export const GENDERS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
  { value: 'O', label: 'Outro' },
]

export const RELATIONSHIPS = [
  { value: 'self', label: 'Eu mesmo' },
  { value: 'spouse', label: 'Cônjuge' },
  { value: 'child', label: 'Filho(a)' },
  { value: 'parent', label: 'Pai/Mãe' },
  { value: 'sibling', label: 'Irmão/Irmã' },
  { value: 'other', label: 'Outro' },
]

export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export const CONFIDENCE_THRESHOLDS = {
  AUTO_ACCEPT: 90,
  ACCEPT_WITH_WARNING: 75,
  REVIEW_REQUIRED: 50,
}

// ============ TAGS (RF16, RF17, RF18) ============

/**
 * Configurações de tags
 */
export const TAG_CONFIG = {
  MAX_TAGS_PER_DOCUMENT: 20,
  MAX_TAG_LENGTH: 50,
  MIN_TAG_LENGTH: 2,
}

/**
 * Dicionário de sinônimos médicos (RN04)
 * Agrupa termos relacionados para expandir buscas automaticamente
 */
export const MEDICAL_SYNONYMS = {
  // Sintomas gripais e respiratórios
  gripe: [
    'resfriado', 'virose', 'rinite', 'tosse', 'febre', 'congestao nasal', 
    'coriza', 'dor de garganta', 'dipirona', 'paracetamol', 'antitermico', 
    'descongestionante', 'vitamina c', 'imunidade', 'influenza', 'h1n1',
    'espirro', 'mal estar', 'calafrios', 'dor no corpo'
  ],
  
  // Diabetes
  diabetes: [
    'glicemia', 'insulina', 'hemoglobina glicada', 'hipoglicemia', 
    'hiperglicemia', 'metformina', 'glicose', 'açucar no sangue',
    'diabetes mellitus', 'tipo 1', 'tipo 2', 'glicosimetro'
  ],
  
  // Hipertensão
  hipertensao: [
    'pressao alta', 'anti-hipertensivo', 'losartana', 'enalapril', 
    'amlodipina', 'captopril', 'pressao arterial', 'hipertenso',
    'hidrolorotiazida', 'diuretico'
  ],
  
  // Dor de cabeça
  'dor de cabeca': [
    'cefaleia', 'enxaqueca', 'migranea', 'analgesico', 'dor cabeca',
    'ibuprofeno', 'paracetamol', 'aspirina', 'tensional'
  ],
  
  // Alergia
  alergia: [
    'rinite alergica', 'urticaria', 'anti-histaminico', 'loratadina',
    'prurido', 'coceira', 'alergenico', 'antialergico', 'desloratadina',
    'corticoide', 'prednisolona'
  ],
  
  // Infecção
  infeccao: [
    'antibiotico', 'amoxicilina', 'azitromicina', 'inflamacao', 'febre',
    'infeccioso', 'bacteriana', 'viral', 'cefalexina', 'ciprofloxacino'
  ],
  
  // Dor muscular/articular
  'dor muscular': [
    'mialgia', 'artralgia', 'dor articular', 'anti-inflamatorio',
    'nimesulida', 'diclofenaco', 'relaxante muscular', 'dorflex',
    'torciculo', 'lombalgia', 'dor nas costas'
  ],
  
  // Gastro
  gastrite: [
    'azia', 'refluxo', 'queimacao', 'estomago', 'omeprazol', 
    'pantoprazol', 'esomeprazol', 'antiácido', 'indigestao',
    'gastroesofagico', 'ulcera'
  ],
  
  // Ansiedade/Depressão
  ansiedade: [
    'ansiolitico', 'depressao', 'antidepressivo', 'sertralina',
    'fluoxetina', 'escitalopram', 'panico', 'insonia', 'estresse'
  ],
  
  // Colesterol
  colesterol: [
    'dislipidemia', 'triglicerideos', 'estatina', 'sinvastatina',
    'atorvastatina', 'rosuvastatina', 'ldl', 'hdl', 'lipidograma'
  ],
  
  // Exames comuns
  hemograma: [
    'exame de sangue', 'leucocitos', 'hemacias', 'plaquetas',
    'hemoglobina', 'hematocrito', 'anemia', 'leucograma'
  ],
  
  // Vacinas
  vacina: [
    'imunizacao', 'dose', 'reforco', 'calendario vacinal',
    'covid', 'gripe', 'influenza', 'tetano', 'hepatite'
  ],
}

/**
 * Normaliza uma tag (minúsculas, sem acentos, trim)
 */
export function normalizeTag(tag) {
  if (!tag) return ''
  return tag
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
}

/**
 * Expande um termo de busca usando o dicionário de sinônimos (RF17)
 * @param {string} searchTerm - Termo de busca
 * @returns {string[]} - Array com termo original + sinônimos
 */
export function expandSearchWithSynonyms(searchTerm) {
  const normalized = normalizeTag(searchTerm)
  const expandedTerms = new Set([normalized])
  
  // Busca direta no dicionário
  if (MEDICAL_SYNONYMS[normalized]) {
    MEDICAL_SYNONYMS[normalized].forEach(syn => expandedTerms.add(normalizeTag(syn)))
    expandedTerms.add(normalized) // Adiciona o termo principal também
  }
  
  // Busca reversa (termo está em alguma lista de sinônimos?)
  for (const [mainTerm, synonyms] of Object.entries(MEDICAL_SYNONYMS)) {
    const normalizedSynonyms = synonyms.map(normalizeTag)
    if (normalizedSynonyms.includes(normalized) || normalizeTag(mainTerm) === normalized) {
      expandedTerms.add(normalizeTag(mainTerm))
      normalizedSynonyms.forEach(syn => expandedTerms.add(syn))
    }
  }
  
  return Array.from(expandedTerms).filter(t => t.length > 0)
}

/**
 * Verifica se uma tag corresponde a um termo de busca (com sinônimos)
 * @param {string[]} documentTags - Tags do documento
 * @param {string} searchTerm - Termo de busca
 * @returns {boolean}
 */
export function matchesTagWithSynonyms(documentTags, searchTerm) {
  if (!documentTags?.length || !searchTerm) return false
  
  const expandedTerms = expandSearchWithSynonyms(searchTerm)
  const normalizedDocTags = documentTags.map(normalizeTag)
  
  return expandedTerms.some(term => 
    normalizedDocTags.some(docTag => 
      docTag.includes(term) || term.includes(docTag)
    )
  )
}
