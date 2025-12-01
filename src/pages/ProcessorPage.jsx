import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '../contexts/AuthContext'
import { useProcessing, DocumentStatus } from '../contexts/ProcessingContext'
import { processDocument, processExtractedTags } from '../services/aiService'
import { createDocument, getPatients } from '../services/firestoreService'
import { validateFile, formatFileSize, findPossiblePatients, generateFinalName } from '../lib/utils'
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '../lib/constants'
import PatientMatchModal from '../components/PatientMatchModal'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Eye,
  Download,
  Trash2,
  AlertTriangle,
  User,
  Users
} from 'lucide-react'
import toast from 'react-hot-toast'

// Componente de item na fila
function QueueItem({ item, onRetry, onRemove, onView, onSelectPatient }) {
  const statusConfig = {
    [DocumentStatus.PENDING]: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-100' },
    [DocumentStatus.EXTRACTING]: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-100', spin: true },
    [DocumentStatus.CLASSIFYING]: { icon: RefreshCw, color: 'text-primary-500', bg: 'bg-primary-100', spin: true },
    [DocumentStatus.MATCHING]: { icon: RefreshCw, color: 'text-purple-500', bg: 'bg-purple-100', spin: true },
    [DocumentStatus.AWAITING_CONFIRMATION]: { icon: Users, color: 'text-warning-500', bg: 'bg-warning-100' },
    [DocumentStatus.COMPLETED]: { icon: CheckCircle, color: 'text-success-500', bg: 'bg-success-50' },
    [DocumentStatus.ERROR]: { icon: XCircle, color: 'text-error-500', bg: 'bg-error-50' },
  }

  const config = statusConfig[item.status] || statusConfig[DocumentStatus.PENDING]
  const Icon = config.icon

  const stageLabels = {
    [DocumentStatus.PENDING]: 'Aguardando...',
    [DocumentStatus.EXTRACTING]: 'Extraindo texto...',
    [DocumentStatus.CLASSIFYING]: 'Classificando...',
    [DocumentStatus.MATCHING]: 'Vinculando paciente...',
    [DocumentStatus.AWAITING_CONFIRMATION]: 'Aguardando confirmação...',
    [DocumentStatus.COMPLETED]: 'Concluído',
    [DocumentStatus.ERROR]: 'Erro',
  }

  return (
    <div className={`card p-4 ${config.bg} border-l-4 ${item.status === DocumentStatus.ERROR ? 'border-error-500' : item.status === DocumentStatus.COMPLETED ? 'border-success-500' : 'border-primary-500'}`}>
      <div className="flex items-start gap-4">
        {/* Ícone de status */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg}`}>
          <Icon className={`w-5 h-5 ${config.color} ${config.spin ? 'animate-spin' : ''}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 truncate">{item.fileName}</h4>
            <span className="text-xs text-gray-500">{formatFileSize(item.fileSize)}</span>
          </div>
          
          {/* Paciente pré-selecionado */}
          {item.preSelectedPatient && item.preSelectedPatient.id && (
            <div className="flex items-center gap-1 text-sm text-primary-600 mt-1">
              <User className="w-3 h-3" />
              <span>{item.preSelectedPatient.name} (pré-selecionado)</span>
            </div>
          )}
          
          <p className="text-sm text-gray-600 mt-1">{stageLabels[item.status]}</p>

          {/* Barra de progresso */}
          {item.status !== DocumentStatus.COMPLETED && item.status !== DocumentStatus.ERROR && (
            <div className="progress-bar mt-2">
              <div 
                className="progress-bar-fill"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          )}

          {/* Resultado */}
          {item.status === DocumentStatus.COMPLETED && item.result && (
            <div className="mt-2 text-sm">
              <span className="badge-primary mr-2">{item.result.classification?.classification?.type}</span>
              <span className="badge-success">{item.result.classification?.classification?.specialty}</span>
              <span className="text-gray-500 ml-2">
                Confiança: {item.result.classification?.classification?.confidence}%
              </span>
              {item.result.linkedPatient && (
                <span className="ml-2 flex items-center gap-1 text-gray-600">
                  <User className="w-3 h-3" />
                  {item.result.linkedPatient.name}
                </span>
              )}
            </div>
          )}

          {/* Aguardando confirmação de paciente */}
          {item.status === DocumentStatus.AWAITING_CONFIRMATION && item.pendingResult && (
            <div className="mt-2">
              <div className="text-sm mb-2">
                <span className="badge-primary mr-2">{item.pendingResult.classification?.classification?.type}</span>
                <span className="badge-success">{item.pendingResult.classification?.classification?.specialty}</span>
              </div>
              <button
                onClick={() => onSelectPatient(item)}
                className="btn-primary text-sm py-1.5 px-3 flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Selecionar Paciente
              </button>
            </div>
          )}

          {/* Erro */}
          {item.status === DocumentStatus.ERROR && (
            <p className="text-sm text-error-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {item.error}
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2">
          {item.status === DocumentStatus.COMPLETED && (
            <>
              <button
                onClick={() => onView(item)}
                className="p-2 rounded-lg hover:bg-white text-gray-600"
                title="Visualizar"
              >
                <Eye className="w-4 h-4" />
              </button>
            </>
          )}
          
          {item.status === DocumentStatus.ERROR && item.retryCount < 3 && (
            <button
              onClick={() => onRetry(item.id)}
              className="p-2 rounded-lg hover:bg-white text-primary-600"
              title="Tentar novamente"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          
          {(item.status === DocumentStatus.PENDING || item.status === DocumentStatus.ERROR) && (
            <button
              onClick={() => onRemove(item.id)}
              className="p-2 rounded-lg hover:bg-white text-error-600"
              title="Remover"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProcessorPage() {
  const { user } = useAuth()
  const { 
    queue, 
    addToQueue, 
    updateItem, 
    removeFromQueue, 
    retryItem,
    getStats,
  } = useProcessing()
  
  const [patients, setPatients] = useState([])
  const [processing, setProcessing] = useState(false)
  const [preSelectedPatient, setPreSelectedPatient] = useState(null)
  
  // Modal de confirmação de paciente
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    item: null,
    suggestedPatients: [],
    extractedName: '',
  })
  
  // Referência para callback de confirmação
  const confirmationCallback = useRef(null)

  // Carregar pacientes
  useEffect(() => {
    if (user) {
      getPatients(user.uid).then(setPatients).catch(console.error)
    }
  }, [user])

  // Função para verificar se precisa confirmação de paciente
  function needsPatientConfirmation(suggestedPatients) {
    // Caso 1: Múltiplos matches
    if (suggestedPatients.length > 1) return true
    
    // Caso 2: 1 match com confiança entre 75-89%
    if (suggestedPatients.length === 1) {
      const confidence = suggestedPatients[0].confidence
      if (confidence >= 75 && confidence < 90) return true
    }
    
    // Caso 3: Nenhum match mas há nomes extraídos
    // (podemos deixar o usuário vincular manualmente)
    
    return false
  }

  // Handler de confirmação de paciente
  async function handlePatientConfirm(patientId) {
    const { item } = confirmationModal
    
    if (!item) return
    
    setConfirmationModal({ isOpen: false, item: null, suggestedPatients: [], extractedName: '' })
    
    // Encontrar o paciente selecionado
    const linkedPatient = patientId ? patients.find(p => p.id === patientId) : null
    
    // Continuar o processamento com o paciente selecionado
    try {
      const pendingResult = item.pendingResult
      const classification = pendingResult.classification?.classification || {}
      
      const finalName = generateFinalName({
        date: classification.date,
        patientSlug: linkedPatient?.slug,
        type: classification.type,
        specialty: classification.specialty,
        originalName: item.fileName,
      })

      // Salvar no Firestore
      const savedDoc = await createDocument(user.uid, item.file, {
        finalName,
        type: classification.type,
        specialty: classification.specialty,
        date: classification.date,
        confidence: classification.confidence || 0,
        patientId: patientId,
        extractedText: pendingResult.extractedText,
        classification: pendingResult.classification,
        tags: processExtractedTags(pendingResult.classification?.tags || []), // RF16: Tags automáticas
        suggestedPatients: item.suggestedPatients?.map(sp => ({
          patientId: sp.patient.id,
          name: sp.patient.name,
          confidence: sp.confidence,
        })) || [],
      })

      // Sucesso
      updateItem(item.id, { 
        status: DocumentStatus.COMPLETED,
        progress: 100,
        pendingResult: null,
        suggestedPatients: null,
        result: {
          ...pendingResult,
          documentId: savedDoc.id,
          fileUrl: savedDoc.fileUrl, // URL do arquivo no Storage
          linkedPatient,
          suggestedPatients: item.suggestedPatients || [],
        },
      })
      
      toast.success(`${item.fileName} processado com sucesso!`)
      
    } catch (error) {
      console.error('Erro ao salvar documento:', error)
      updateItem(item.id, {
        status: DocumentStatus.ERROR,
        error: error.message || 'Erro ao salvar documento',
        pendingResult: null,
      })
      toast.error(`Erro ao salvar ${item.fileName}`)
    }
    
    setProcessing(false)
  }

  // Processar fila
  useEffect(() => {
    async function processQueue() {
      const pendingItems = queue.filter(item => item.status === DocumentStatus.PENDING)
      
      if (pendingItems.length === 0 || processing) return
      
      setProcessing(true)
      const item = pendingItems[0]
      
      try {
        // Atualiza status para extraindo
        updateItem(item.id, { 
          status: DocumentStatus.EXTRACTING, 
          progress: 10 
        })

        // Processa documento
        const result = await processDocument(item.file, (progress) => {
          updateItem(item.id, {
            status: progress.stage === 'extracting' ? DocumentStatus.EXTRACTING : DocumentStatus.CLASSIFYING,
            progress: progress.progress,
          })
        })

        // Matching de paciente
        updateItem(item.id, { status: DocumentStatus.MATCHING, progress: 80 })
        
        // Determinar paciente
        let linkedPatientId = null
        let linkedPatient = null
        let suggestedPatients = []
        
        // Se paciente foi pré-selecionado, usar diretamente (pula matching)
        if (item.preSelectedPatient && item.preSelectedPatient.id) {
          linkedPatientId = item.preSelectedPatient.id
          linkedPatient = item.preSelectedPatient
        } else {
          // Lógica de matching automático
          const extractedNames = result.classification?.patient_names || []
          let extractedPatientName = ''
          
          for (const nameInfo of extractedNames) {
            if (nameInfo.role === 'paciente') {
              extractedPatientName = nameInfo.name
              const matches = findPossiblePatients(nameInfo.name, patients)
              suggestedPatients = [...suggestedPatients, ...matches]
            }
          }
          
          // Remover duplicatas (mesmo paciente pode aparecer múltiplas vezes)
          const uniquePatients = new Map()
          for (const sp of suggestedPatients) {
            if (!uniquePatients.has(sp.patient.id) || uniquePatients.get(sp.patient.id).confidence < sp.confidence) {
              uniquePatients.set(sp.patient.id, sp)
            }
          }
          suggestedPatients = Array.from(uniquePatients.values())

          // Verificar se precisa confirmação
          if (needsPatientConfirmation(suggestedPatients)) {
            // Pausar e aguardar confirmação do usuário
            updateItem(item.id, { 
              status: DocumentStatus.AWAITING_CONFIRMATION,
              progress: 85,
              pendingResult: result,
              suggestedPatients,
            })
            
            // Abrir modal automaticamente
            setConfirmationModal({
              isOpen: true,
              item: { ...item, pendingResult: result, suggestedPatients },
              suggestedPatients,
              extractedName: extractedPatientName,
            })
            
            // Não continua - aguarda callback do modal
            return
          }

          // Auto-link se confiança >= 90%
          if (suggestedPatients.length === 1 && suggestedPatients[0].confidence >= 90) {
            linkedPatientId = suggestedPatients[0].patient.id
            linkedPatient = suggestedPatients[0].patient
          }
        }

        // Gerar nome final
        const classification = result.classification?.classification || {}
        const finalName = generateFinalName({
          date: classification.date,
          patientSlug: linkedPatient?.slug,
          type: classification.type,
          specialty: classification.specialty,
          originalName: item.fileName,
        })

        // Salvar no Firestore
        const savedDoc = await createDocument(user.uid, item.file, {
          finalName,
          type: classification.type,
          specialty: classification.specialty,
          date: classification.date,
          confidence: classification.confidence || 0,
          patientId: linkedPatientId,
          extractedText: result.extractedText,
          classification: result.classification,
          tags: processExtractedTags(result.classification?.tags || []), // RF16: Tags automáticas
          suggestedPatients: suggestedPatients.map(sp => ({
            patientId: sp.patient.id,
            name: sp.patient.name,
            confidence: sp.confidence,
          })),
        })

        // Sucesso
        updateItem(item.id, { 
          status: DocumentStatus.COMPLETED,
          progress: 100,
          result: {
            ...result,
            documentId: savedDoc.id,
            fileUrl: savedDoc.fileUrl, // URL do arquivo no Storage
            linkedPatient,
            suggestedPatients,
          },
        })
        
        toast.success(`${item.fileName} processado com sucesso!`)
        
      } catch (error) {
        console.error('Erro ao processar:', error)
        updateItem(item.id, {
          status: DocumentStatus.ERROR,
          error: error.message || 'Erro ao processar documento',
        })
        toast.error(`Erro ao processar ${item.fileName}`)
      } finally {
        setProcessing(false)
      }
    }
    
    processQueue()
  }, [queue, processing, user, patients, updateItem])

  // Dropzone
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Arquivos rejeitados pelo dropzone
    rejectedFiles.forEach(file => {
      toast.error(`${file.file.name}: ${file.errors[0]?.message || 'Arquivo inválido'}`)
    })

    // Validar arquivos aceitos
    const validFiles = []
    
    for (const file of acceptedFiles) {
      const validation = validateFile(file, MAX_FILE_SIZE)
      
      if (validation.valid) {
        validFiles.push(file)
      } else {
        toast.error(`${file.name}: ${validation.errors[0]}`)
      }
    }

    if (validFiles.length > 0) {
      // Adicionar paciente pré-selecionado aos arquivos
      const enhancedFiles = validFiles.map(file => ({
        originalFile: file,
        preSelectedPatientId: preSelectedPatient?.id,
        preSelectedPatient: preSelectedPatient,
      }))
      
      addToQueue(enhancedFiles)
      toast.success(`${validFiles.length} arquivo(s) adicionado(s) à fila`)
    }
  }, [addToQueue, preSelectedPatient])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
  })

  // Abrir modal para item aguardando confirmação
  function openPatientModal(item) {
    setConfirmationModal({
      isOpen: true,
      item,
      suggestedPatients: item.suggestedPatients || [],
      extractedName: item.pendingResult?.classification?.patient_names?.find(n => n.role === 'paciente')?.name || '',
    })
  }

  const stats = getStats()

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Smart Processor</h1>
        <p className="text-gray-500 mt-1">
          Envie documentos médicos para processamento automático com IA
        </p>
      </div>

      {/* Seletor de paciente para upload em massa */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="label">Paciente (opcional - para upload em massa)</label>
            <select
              value={preSelectedPatient?.id || ''}
              onChange={(e) => {
                const patientId = e.target.value
                const patient = patients.find(p => p.id === patientId) || null
                setPreSelectedPatient(patient)
              }}
              className="input"
            >
              <option value="">Selecionar paciente...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {preSelectedPatient && (
            <button
              onClick={() => setPreSelectedPatient(null)}
              className="mt-6 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Limpar
            </button>
          )}
        </div>
        {preSelectedPatient && (
          <p className="text-sm text-primary-600 mt-2 flex items-center gap-1">
            <User className="w-4 h-4" />
            Todos os documentos enviados serão vinculados a <strong>{preSelectedPatient.name}</strong>
          </p>
        )}
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-primary-500' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-700">
          {isDragActive ? 'Solte os arquivos aqui...' : 'Arraste arquivos aqui ou clique para escolher'}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Aceita: PDF, JPG, PNG • Máximo: 50MB por arquivo
        </p>
      </div>

      {/* Estatísticas da fila */}
      {queue.length > 0 && (
        <div className="flex items-center gap-6 text-sm">
          <span className="text-gray-500">
            <strong className="text-gray-900">{stats.total}</strong> na fila
          </span>
          {stats.processing > 0 && (
            <span className="text-primary-600">
              <strong>{stats.processing}</strong> processando
            </span>
          )}
          {stats.completed > 0 && (
            <span className="text-success-600">
              <strong>{stats.completed}</strong> concluídos
            </span>
          )}
          {stats.errors > 0 && (
            <span className="text-error-600">
              <strong>{stats.errors}</strong> erros
            </span>
          )}
        </div>
      )}

      {/* Fila de processamento */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-500" />
          Fila de Processamento
        </h2>

        {queue.length === 0 ? (
          <div className="card p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">
              Nenhum arquivo na fila
            </h3>
            <p className="text-gray-500">
              Arraste documentos para a área acima para começar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map(item => (
              <QueueItem
                key={item.id}
                item={item}
                onRetry={retryItem}
                onRemove={removeFromQueue}
                onView={(item) => {
                  // Abrir documento em nova aba
                  if (item.result?.fileUrl) {
                    window.open(item.result.fileUrl, '_blank')
                  } else if (item.file) {
                    // Fallback: criar URL temporária do arquivo local
                    const url = URL.createObjectURL(item.file)
                    window.open(url, '_blank')
                  }
                }}
                onSelectPatient={openPatientModal}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal de confirmação de paciente */}
      <PatientMatchModal
        isOpen={confirmationModal.isOpen}
        onClose={() => {
          // Fechar modal mas manter item aguardando
          setConfirmationModal(prev => ({ ...prev, isOpen: false }))
          setProcessing(false)
        }}
        onConfirm={handlePatientConfirm}
        suggestedPatients={confirmationModal.suggestedPatients}
        allPatients={patients}
        documentName={confirmationModal.item?.fileName}
        extractedName={confirmationModal.extractedName}
      />
    </div>
  )
}
