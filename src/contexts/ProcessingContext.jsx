import { createContext, useContext, useState, useCallback } from 'react'

const ProcessingContext = createContext(null)

export function useProcessing() {
  const context = useContext(ProcessingContext)
  if (!context) {
    throw new Error('useProcessing must be used within a ProcessingProvider')
  }
  return context
}

// Estados possíveis do documento
export const DocumentStatus = {
  PENDING: 'pending',
  EXTRACTING: 'extracting',
  CLASSIFYING: 'classifying',
  MATCHING: 'matching',
  AWAITING_CONFIRMATION: 'awaiting_confirmation', // Aguardando confirmação do usuário
  COMPLETED: 'completed',
  ERROR: 'error',
}

// Etapas do processamento
export const ProcessingStages = {
  EXTRACTING: { label: 'Extraindo texto', progress: 25 },
  CLASSIFYING: { label: 'Classificando documento', progress: 50 },
  MATCHING: { label: 'Vinculando paciente', progress: 75 },
  COMPLETED: { label: 'Concluído', progress: 100 },
}

export function ProcessingProvider({ children }) {
  const [queue, setQueue] = useState([])
  const [processing, setProcessing] = useState(false)

  // Adicionar item à fila (RF08)
  const addToQueue = useCallback((files) => {
    const newItems = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      status: DocumentStatus.PENDING,
      progress: 0,
      stage: null,
      result: null,
      error: null,
      retryCount: 0,
      createdAt: new Date(),
    }))

    setQueue(prev => [...prev, ...newItems])
    return newItems
  }, [])

  // Atualizar status de um item
  const updateItem = useCallback((id, updates) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ))
  }, [])

  // Remover item da fila
  const removeFromQueue = useCallback((id) => {
    setQueue(prev => prev.filter(item => item.id !== id))
  }, [])

  // Limpar itens concluídos
  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(item => item.status !== DocumentStatus.COMPLETED))
  }, [])

  // Retry de item com erro
  const retryItem = useCallback((id) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { 
        ...item, 
        status: DocumentStatus.PENDING,
        progress: 0,
        stage: null,
        error: null,
        retryCount: item.retryCount + 1,
      } : item
    ))
  }, [])

  // Estatísticas da fila
  const getStats = useCallback(() => {
    const pending = queue.filter(i => i.status === DocumentStatus.PENDING).length
    const processing = queue.filter(i => 
      [DocumentStatus.EXTRACTING, DocumentStatus.CLASSIFYING, DocumentStatus.MATCHING].includes(i.status)
    ).length
    const completed = queue.filter(i => i.status === DocumentStatus.COMPLETED).length
    const errors = queue.filter(i => i.status === DocumentStatus.ERROR).length

    return { pending, processing, completed, errors, total: queue.length }
  }, [queue])

  const value = {
    queue,
    processing,
    setProcessing,
    addToQueue,
    updateItem,
    removeFromQueue,
    clearCompleted,
    retryItem,
    getStats,
    DocumentStatus,
    ProcessingStages,
  }

  return (
    <ProcessingContext.Provider value={value}>
      {children}
    </ProcessingContext.Provider>
  )
}
