// Modal de seleção de paciente quando há múltiplos matches ou match com confiança média
import { useState } from 'react'
import { User, Users, AlertTriangle, Check, X, HelpCircle } from 'lucide-react'
import Modal from './ui/Modal'

/**
 * Modal para confirmação de paciente quando:
 * - Há múltiplos matches encontrados
 * - Há 1 match com confiança entre 75-89%
 * - Nenhum match foi encontrado (permite seleção manual)
 */
export default function PatientMatchModal({
  isOpen,
  onClose,
  onConfirm,
  suggestedPatients = [],
  allPatients = [],
  documentName,
  extractedName,
}) {
  const [selectedPatientId, setSelectedPatientId] = useState(
    suggestedPatients.length === 1 ? suggestedPatients[0].patient.id : null
  )
  const [showAllPatients, setShowAllPatients] = useState(false)

  // Determinar tipo de cenário
  const scenario = getScenario(suggestedPatients)

  function getScenario(suggestions) {
    if (suggestions.length === 0) {
      return {
        type: 'no-match',
        title: 'Nenhum paciente identificado',
        description: 'Não foi possível identificar automaticamente o paciente deste documento.',
        icon: HelpCircle,
        iconColor: 'text-gray-500',
        iconBg: 'bg-gray-100',
      }
    }
    
    if (suggestions.length === 1 && suggestions[0].confidence >= 75 && suggestions[0].confidence < 90) {
      return {
        type: 'low-confidence',
        title: 'Confirme o paciente',
        description: `Encontramos um possível paciente, mas a confiança é de ${suggestions[0].confidence}%.`,
        icon: AlertTriangle,
        iconColor: 'text-warning-600',
        iconBg: 'bg-warning-100',
      }
    }
    
    return {
      type: 'multiple',
      title: 'Múltiplos pacientes encontrados',
      description: 'Encontramos mais de uma possibilidade. Selecione o paciente correto.',
      icon: Users,
      iconColor: 'text-primary-600',
      iconBg: 'bg-primary-100',
    }
  }

  function handleConfirm() {
    onConfirm(selectedPatientId)
  }

  function handleSkip() {
    onConfirm(null)
  }

  // Pacientes a exibir
  const displayPatients = showAllPatients 
    ? allPatients 
    : suggestedPatients.length > 0 
      ? suggestedPatients.map(s => ({ ...s.patient, confidence: s.confidence }))
      : []

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={scenario.title}
      size="md"
    >
      <div className="p-6">
        {/* Contexto */}
        <div className={`flex items-start gap-4 p-4 rounded-lg ${scenario.iconBg} mb-6`}>
          <scenario.icon className={`w-6 h-6 ${scenario.iconColor} flex-shrink-0`} />
          <div>
            <p className="text-gray-700">{scenario.description}</p>
            {extractedName && (
              <p className="text-sm text-gray-500 mt-2">
                Nome encontrado no documento: <strong>"{extractedName}"</strong>
              </p>
            )}
          </div>
        </div>

        {/* Documento sendo processado */}
        <div className="mb-4 px-4 py-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Documento:</p>
          <p className="font-medium text-gray-900 truncate">{documentName}</p>
        </div>

        {/* Lista de opções */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {displayPatients.map((patient) => {
            const patientId = patient.id
            const confidence = patient.confidence
            const isSelected = selectedPatientId === patientId
            
            return (
              <button
                key={patientId}
                onClick={() => setSelectedPatientId(patientId)}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left
                  ${isSelected 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {/* Indicador de seleção */}
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${isSelected 
                    ? 'border-primary-500 bg-primary-500' 
                    : 'border-gray-300'
                  }
                `}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>

                {/* Info do paciente */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{patient.name}</span>
                  </div>
                  {patient.relationship && (
                    <span className="text-sm text-gray-500">{patient.relationship}</span>
                  )}
                </div>

                {/* Confiança */}
                {confidence && (
                  <div className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${confidence >= 90 
                      ? 'bg-success-100 text-success-700' 
                      : confidence >= 75 
                        ? 'bg-warning-100 text-warning-700' 
                        : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {confidence}%
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Toggle para mostrar todos os pacientes */}
        {!showAllPatients && allPatients.length > suggestedPatients.length && (
          <button
            onClick={() => setShowAllPatients(true)}
            className="w-full mt-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:underline"
          >
            Mostrar todos os pacientes ({allPatients.length})
          </button>
        )}

        {showAllPatients && (
          <button
            onClick={() => setShowAllPatients(false)}
            className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:underline"
          >
            Mostrar apenas sugestões
          </button>
        )}

        {/* Ações */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleSkip}
            className="flex-1 btn-secondary flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Pular (vincular depois)
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={!selectedPatientId}
            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            Confirmar
          </button>
        </div>
      </div>
    </Modal>
  )
}
