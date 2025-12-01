import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useFamily } from '../contexts/FamilyContext'
import { getDocuments, getPatients, deleteDocument, linkDocumentToPatient, getDocumentTags } from '../services/firestoreService'
import { getDocumentsWithShared, getVisiblePatients } from '../services/familyService'
import { DOCUMENT_TYPES, SPECIALTIES, expandSearchWithSynonyms, normalizeTag } from '../lib/constants'
import { formatDate, formatFileSize, getConfidenceColor, debounce } from '../lib/utils'
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Trash2, 
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  User,
  Tag,
  Sparkles
} from 'lucide-react'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import TagManager, { TagList } from '../components/TagManager'
import toast from 'react-hot-toast'

// Ícone por tipo de documento
function DocumentIcon({ type }) {
  const icons = {
    'Exame': { icon: '📄', class: 'doc-icon-exame' },
    'Receita': { icon: '💊', class: 'doc-icon-receita' },
    'Laudo': { icon: '🩺', class: 'doc-icon-laudo' },
    'Vacina': { icon: '💉', class: 'doc-icon-vacina' },
    'Outro': { icon: '📋', class: 'doc-icon-outro' },
  }
  
  const config = icons[type] || icons['Outro']
  
  return (
    <div className={`doc-icon ${config.class}`}>
      <span className="text-xl">{config.icon}</span>
    </div>
  )
}

// Modal de visualização de documento
function DocumentViewModal({ document, patient, isOpen, onClose, onTagsChange }) {
  if (!document) return null

  const { autoTags, manualTags } = getDocumentTags(document)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={document.finalName} size="lg">
      <div className="space-y-6">
        {/* Metadados */}
        <div className="card p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">📊 Metadados</h4>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Tipo</dt>
            <dd className="font-medium">{document.type}</dd>
            
            <dt className="text-gray-500">Especialidade</dt>
            <dd className="font-medium">{document.specialty}</dd>
            
            <dt className="text-gray-500">Data</dt>
            <dd className="font-medium">{document.date ? formatDate(document.date) : 'N/A'}</dd>
            
            <dt className="text-gray-500">Paciente</dt>
            <dd className="font-medium">{patient?.name || 'Não vinculado'}</dd>
            
            <dt className="text-gray-500">Confiança</dt>
            <dd className={`font-medium ${getConfidenceColor(document.confidence)}`}>
              {document.confidence}%
            </dd>
            
            <dt className="text-gray-500">Tamanho</dt>
            <dd className="font-medium">{formatFileSize(document.fileSize)}</dd>
          </dl>
        </div>

        {/* Tags (RF16, RF18) */}
        <div className="card p-4 bg-gray-50">
          <TagManager
            documentId={document.id}
            autoTags={autoTags}
            manualTags={manualTags}
            onTagsChange={onTagsChange}
          />
        </div>

        {/* Texto extraído */}
        {document.extractedContent && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">📝 Texto Extraído</h4>
            <div className="card p-4 bg-gray-50 max-h-64 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                {document.extractedContent}
              </pre>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <a
            href={document.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            <ExternalLink className="w-4 h-4" />
            Visualizar Original
          </a>
          <a
            href={document.fileUrl}
            download={document.finalName}
            className="btn-primary"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
        </div>
      </div>
    </Modal>
  )
}

// Card de documento
function DocumentCard({ document, patient, patients, onView, onDelete, onLink }) {
  const [showLinkMenu, setShowLinkMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Obter tags do documento
  const { autoTags, manualTags } = getDocumentTags(document)
  const allTags = [...autoTags, ...manualTags]

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return
    
    setDeleting(true)
    try {
      await onDelete(document.id)
    } catch (error) {
      toast.error('Erro ao excluir documento')
      setDeleting(false)
    }
  }

  return (
    <div className="card p-4 hover:border-primary-200 transition-colors">
      <div className="flex items-start gap-4">
        <DocumentIcon type={document.type} />
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate" title={document.finalName}>
            {document.finalName}
          </h4>
          
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
            <span className="badge-primary">{document.type}</span>
            <span className="badge-success">{document.specialty}</span>
            <span className="text-gray-500">
              {document.date ? formatDate(document.date) : 'Sem data'}
            </span>
          </div>

          {/* Tags (RF16) */}
          {allTags.length > 0 && (
            <div className="mt-2">
              <TagList 
                autoTags={autoTags.slice(0, 3)} 
                manualTags={manualTags.slice(0, 2)}
                maxVisible={5}
              />
            </div>
          )}

          {/* Paciente */}
          <div className="mt-2 flex items-center gap-2">
            {patient ? (
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <User className="w-3 h-3" />
                {patient.name}
              </span>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowLinkMenu(!showLinkMenu)}
                  className="text-sm text-warning-600 flex items-center gap-1 hover:text-warning-700"
                >
                  <AlertCircle className="w-3 h-3" />
                  Vincular paciente
                  <ChevronDown className="w-3 h-3" />
                </button>
                
                {showLinkMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[200px]">
                    {patients.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onLink(document.id, p.id)
                          setShowLinkMenu(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        {p.name}
                      </button>
                    ))}
                    {patients.length === 0 && (
                      <p className="px-4 py-2 text-sm text-gray-500">
                        Nenhum paciente cadastrado
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Confiança */}
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs font-medium ${getConfidenceColor(document.confidence)}`}>
              Confiança: {document.confidence}%
            </span>
            {document.reviewRequired && (
              <span className="badge-warning text-xs">Revisar</span>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onView(document)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            title="Visualizar"
          >
            <Eye className="w-4 h-4" />
          </button>
          <a
            href={document.fileUrl}
            download={document.finalName}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 rounded-lg hover:bg-error-50 text-error-600"
            title="Excluir"
          >
            {deleting ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FilesPage() {
  const { user } = useAuth()
  const { familyGroup } = useFamily()
  const [searchParams] = useSearchParams()
  
  const [documents, setDocuments] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filtros
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [filterPatient, setFilterPatient] = useState(searchParams.get('patient') || '')
  const [showReviewOnly, setShowReviewOnly] = useState(searchParams.get('review') === 'true')
  
  // Modal
  const [viewingDocument, setViewingDocument] = useState(null)

  // Grupos expandidos
  const [expandedPatients, setExpandedPatients] = useState(new Set())

  // Carregar dados (incluindo compartilhados do grupo familiar - RF20)
  useEffect(() => {
    if (!user) return
    
    async function load() {
      try {
        // Usar funções que consideram grupo familiar para ver documentos e pacientes compartilhados
        const [docsData, patientsData] = await Promise.all([
          getDocumentsWithShared(user.uid, familyGroup),
          getVisiblePatients(user.uid, familyGroup),
        ])
        
        setDocuments(docsData)
        setPatients(patientsData)
        
        // Expandir todos os pacientes por padrão
        setExpandedPatients(new Set(patientsData.map(p => p.id)))
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
        toast.error('Erro ao carregar documentos')
      } finally {
        setLoading(false)
      }
    }
    
    load()
  }, [user, familyGroup])

  // Filtrar documentos
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Busca textual com expansão de sinônimos (RF17)
      if (search) {
        const searchLower = search.toLowerCase()
        
        // Expandir busca com sinônimos médicos
        const expandedTerms = expandSearchWithSynonyms(search)
        
        // Obter tags do documento
        const { autoTags, manualTags } = getDocumentTags(doc)
        const allTags = [...autoTags, ...manualTags].map(t => normalizeTag(t))
        
        // Verificar match em campos textuais
        const matchesTextFields = 
          doc.finalName?.toLowerCase().includes(searchLower) ||
          doc.originalName?.toLowerCase().includes(searchLower) ||
          doc.extractedContent?.toLowerCase().includes(searchLower) ||
          doc.type?.toLowerCase().includes(searchLower) ||
          doc.specialty?.toLowerCase().includes(searchLower)
        
        // Verificar match nas tags (com expansão de sinônimos)
        const matchesTags = expandedTerms.some(term => 
          allTags.some(tag => tag.includes(normalizeTag(term)))
        )
        
        // Verificar match no conteúdo extraído com sinônimos expandidos
        const matchesContentWithSynonyms = expandedTerms.some(term =>
          doc.extractedContent?.toLowerCase().includes(term.toLowerCase())
        )
        
        if (!matchesTextFields && !matchesTags && !matchesContentWithSynonyms) return false
      }
      
      // Filtro por tipo
      if (filterType && doc.type !== filterType) return false
      
      // Filtro por especialidade
      if (filterSpecialty && doc.specialty !== filterSpecialty) return false
      
      // Filtro por paciente
      if (filterPatient && doc.patientId !== filterPatient) return false
      
      // Apenas com revisão
      if (showReviewOnly && !doc.reviewRequired) return false
      
      return true
    })
  }, [documents, search, filterType, filterSpecialty, filterPatient, showReviewOnly])

  // Agrupar por paciente (RF11)
  const groupedDocuments = useMemo(() => {
    const groups = new Map()
    
    // Grupo "Sem paciente"
    groups.set('unassigned', {
      patient: null,
      documents: [],
    })
    
    // Grupos por paciente
    for (const patient of patients) {
      groups.set(patient.id, {
        patient,
        documents: [],
      })
    }
    
    // Distribuir documentos
    for (const doc of filteredDocuments) {
      if (doc.patientId && groups.has(doc.patientId)) {
        groups.get(doc.patientId).documents.push(doc)
      } else {
        groups.get('unassigned').documents.push(doc)
      }
    }
    
    return Array.from(groups.entries())
      .filter(([_, group]) => group.documents.length > 0)
  }, [filteredDocuments, patients])

  // Handlers
  async function handleDelete(documentId) {
    try {
      await deleteDocument(user.uid, documentId)
      setDocuments(prev => prev.filter(d => d.id !== documentId))
      toast.success('Documento excluído')
    } catch (error) {
      throw error
    }
  }

  async function handleLink(documentId, patientId) {
    const doc = documents.find(d => d.id === documentId)
    
    try {
      await linkDocumentToPatient(documentId, patientId, doc?.patientId)
      
      setDocuments(prev => prev.map(d => 
        d.id === documentId ? { ...d, patientId } : d
      ))
      
      toast.success('Documento vinculado')
    } catch (error) {
      toast.error('Erro ao vincular documento')
    }
  }

  function togglePatientExpand(patientId) {
    setExpandedPatients(prev => {
      const next = new Set(prev)
      if (next.has(patientId)) {
        next.delete(patientId)
      } else {
        next.add(patientId)
      }
      return next
    })
  }

  // Handler para atualização de tags (RF18)
  async function handleTagsChange(documentId) {
    try {
      // Recarregar todos os documentos para obter as tags atualizadas
      const docsData = await getDocuments(user.uid)
      setDocuments(docsData)
      
      // Atualizar o documento em visualização se for o mesmo
      if (viewingDocument?.id === documentId) {
        const updatedDoc = docsData.find(d => d.id === documentId)
        if (updatedDoc) {
          setViewingDocument(updatedDoc)
        }
      }
    } catch (error) {
      console.error('Erro ao recarregar documentos:', error)
    }
  }

  const debouncedSearch = debounce((value) => setSearch(value), 300)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Arquivos</h1>
        <p className="text-gray-500 mt-1">
          Busque e gerencie seus documentos médicos
        </p>
      </div>

      {/* Barra de busca e filtros */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, tipo, especialidade ou conteúdo..."
              onChange={(e) => debouncedSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          
          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input w-auto"
            >
              <option value="">Todos os tipos</option>
              {DOCUMENT_TYPES.map(t => (
                <option key={t.value} value={t.label}>{t.label}</option>
              ))}
            </select>

            <select
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              className="input w-auto"
            >
              <option value="">Todas especialidades</option>
              {SPECIALTIES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              className="input w-auto"
            >
              <option value="">Todos pacientes</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
              <input
                type="checkbox"
                checked={showReviewOnly}
                onChange={(e) => setShowReviewOnly(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Apenas pendentes</span>
            </label>
          </div>
        </div>

        {/* Contagem */}
        <div className="mt-3 text-sm text-gray-500">
          {filteredDocuments.length} documento(s) encontrado(s)
        </div>
      </div>

      {/* Lista de documentos */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum documento encontrado"
          description={documents.length === 0 
            ? "Você ainda não tem documentos. Envie seu primeiro documento!"
            : "Tente ajustar os filtros de busca"
          }
        />
      ) : (
        <div className="space-y-4">
          {groupedDocuments.map(([groupId, group]) => (
            <div key={groupId} className="card">
              {/* Cabeçalho do grupo */}
              <button
                onClick={() => togglePatientExpand(groupId)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedPatients.has(groupId) ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  
                  <span className="font-medium text-gray-900">
                    {group.patient?.name || 'Sem paciente vinculado'}
                  </span>
                  
                  <span className="text-sm text-gray-500">
                    ({group.documents.length} documento{group.documents.length !== 1 ? 's' : ''})
                  </span>
                </div>
              </button>

              {/* Documentos do grupo */}
              {expandedPatients.has(groupId) && (
                <div className="divide-y divide-gray-100">
                  {group.documents.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      patient={group.patient}
                      patients={patients}
                      onView={setViewingDocument}
                      onDelete={handleDelete}
                      onLink={handleLink}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de visualização */}
      <DocumentViewModal
        document={viewingDocument}
        patient={viewingDocument ? patients.find(p => p.id === viewingDocument.patientId) : null}
        isOpen={!!viewingDocument}
        onClose={() => setViewingDocument(null)}
        onTagsChange={handleTagsChange}
      />
    </div>
  )
}
