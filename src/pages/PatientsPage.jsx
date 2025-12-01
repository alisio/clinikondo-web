import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useFamily } from '../contexts/FamilyContext'
import { 
  getPatients, 
  createPatient, 
  updatePatient, 
  deletePatient,
  addPatientAlias,
  removePatientAlias 
} from '../services/firestoreService'
import { getVisiblePatients, updatePatientSharing } from '../services/familyService'
import { GENDERS, RELATIONSHIPS } from '../lib/constants'
import { 
  UserPlus, 
  Edit2, 
  Trash2, 
  X, 
  Plus,
  FileText,
  Check,
  Users,
  Lock,
  Unlock,
  Settings,
  Eye
} from 'lucide-react'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import PatientSharingSettings, { SharingBadge } from '../components/PatientSharingSettings'
import toast from 'react-hot-toast'
// Formulário de paciente
function PatientForm({ patient, onSubmit, onCancel, loading }) {
  const [name, setName] = useState(patient?.name || '')
  const [gender, setGender] = useState(patient?.gender || 'M')
  const [relationship, setRelationship] = useState(patient?.relationship || '')
  const [dateOfBirth, setDateOfBirth] = useState(patient?.dateOfBirth || '')

  function handleSubmit(e) {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    
    onSubmit({
      name: name.trim(),
      gender,
      relationship: relationship || null,
      dateOfBirth: dateOfBirth || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Nome completo *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="Maria Silva"
          disabled={loading}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Gênero *</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="input"
            disabled={loading}
          >
            {GENDERS.map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Parentesco</label>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="input"
            disabled={loading}
          >
            <option value="">Selecione...</option>
            {RELATIONSHIPS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Data de nascimento</label>
        <input
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          className="input"
          disabled={loading}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button 
          type="button" 
          onClick={onCancel}
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
          {loading ? <Spinner size="sm" /> : patient ? 'Salvar' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}

// Card de paciente
function PatientCard({ patient, onEdit, onDelete, onAddAlias, onRemoveAlias, onShare, hasGroup, isOwn, onClick }) {
  const [newAlias, setNewAlias] = useState('')
  const [showAliasInput, setShowAliasInput] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sharingLoading, setSharingLoading] = useState(false)

  const genderIcons = { M: '👨', F: '👩', O: '🧑' }
  const relationshipLabels = Object.fromEntries(RELATIONSHIPS.map(r => [r.value, r.label]))

  async function handleAddAlias() {
    if (!newAlias.trim()) return
    
    try {
      await onAddAlias(patient.id, newAlias.trim())
      setNewAlias('')
      setShowAliasInput(false)
      toast.success('Apelido adicionado')
    } catch (error) {
      toast.error(error.message)
    }
  }

  async function handleRemoveAlias(alias) {
    try {
      await onRemoveAlias(patient.id, alias)
      toast.success('Apelido removido')
    } catch (error) {
      toast.error('Erro ao remover apelido')
    }
  }

  async function handleDelete() {
    if (!confirm(`Tem certeza que deseja excluir ${patient.name}?`)) return
    
    setDeleting(true)
    try {
      await onDelete(patient.id)
      toast.success('Paciente excluído')
    } catch (error) {
      toast.error('Erro ao excluir paciente')
      setDeleting(false)
    }
  }

  async function handleToggleSharing() {
    if (!isOwn) return // Só dono pode alterar compartilhamento
    
    setSharingLoading(true)
    try {
      await onShare(patient.id, !patient.isShared)
      toast.success(patient.isShared ? 'Paciente agora é privado' : 'Paciente compartilhado com o grupo')
    } catch (error) {
      toast.error(error.message || 'Erro ao alterar compartilhamento')
    } finally {
      setSharingLoading(false)
    }
  }

  return (
    <div 
      className={`card p-6 ${!isOwn ? 'border-primary-200 bg-primary-50/30' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{genderIcons[patient.gender] || '🧑'}</div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{patient.name}</h3>
              {!isOwn && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-700">
                  <Eye className="w-3 h-3" />
                  Compartilhado
                </span>
              )}
            </div>
            {patient.relationship && (
              <span className="text-sm text-gray-500">
                {relationshipLabels[patient.relationship] || patient.relationship}
              </span>
            )}
          </div>
        </div>
        
        {isOwn && (
          <div className="flex items-center gap-1">
            {/* Botão de compartilhamento (só se tiver grupo) */}
            {hasGroup && (
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleSharing(); }}
                disabled={sharingLoading}
                className={`p-2 rounded-lg ${
                  patient.isShared 
                    ? 'bg-primary-100 text-primary-600 hover:bg-primary-200' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                title={patient.isShared ? 'Compartilhado - clique para tornar privado' : 'Privado - clique para compartilhar'}
              >
                {sharingLoading ? (
                  <Spinner size="sm" />
                ) : patient.isShared ? (
                  <Unlock className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(patient); }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              disabled={deleting}
              className="p-2 rounded-lg hover:bg-error-50 text-error-600"
              title="Excluir"
            >
              {deleting ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        {patient.dateOfBirth && (
          <div>
            Nascimento: {new Date(patient.dateOfBirth).toLocaleDateString('pt-BR')}
          </div>
        )}
        <div className="flex items-center gap-1">
          <FileText className="w-4 h-4" />
          {patient.documentCount || 0} documentos
        </div>
        {/* Badge de compartilhamento */}
        {hasGroup && isOwn && (
          <div className="pt-1">
            <SharingBadge isShared={patient.isShared} size="sm" />
          </div>
        )}
      </div>

      {/* Aliases - só mostra para pacientes próprios */}
      {isOwn && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Apelidos</span>
            {!showAliasInput && (patient.aliases?.length || 0) < 10 && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowAliasInput(true); }}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Adicionar
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {patient.aliases?.map(alias => (
              <span 
                key={alias}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm"
              >
                {alias}
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveAlias(alias); }}
                  className="text-gray-400 hover:text-error-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            
            {(!patient.aliases || patient.aliases.length === 0) && !showAliasInput && (
              <span className="text-sm text-gray-400 italic">Nenhum apelido</span>
            )}
          </div>

          {/* Input para novo alias */}
          {showAliasInput && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                className="input flex-1"
                placeholder="Digite o apelido..."
                maxLength={50}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddAlias()
                  if (e.key === 'Escape') {
                    setShowAliasInput(false)
                    setNewAlias('')
                  }
                }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleAddAlias(); }}
                className="p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setShowAliasInput(false)
                  setNewAlias('')
                }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PatientsPage() {
  const { user } = useAuth()
  const { hasGroup, familyGroup } = useFamily()
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState(null)
  const [saving, setSaving] = useState(false)

  // Carregar pacientes (próprios + compartilhados do grupo)
  useEffect(() => {
    if (!user) return
    
    loadPatients()
  }, [user, familyGroup])

  async function loadPatients() {
    try {
      // Se tem grupo familiar, busca também pacientes compartilhados
      if (familyGroup) {
        const data = await getVisiblePatients(user.uid, familyGroup)
        setPatients(data)
      } else {
        // Sem grupo, busca apenas pacientes próprios
        const data = await getPatients(user.uid)
        setPatients(data.map(p => ({ ...p, isOwn: true })))
      }
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
      toast.error('Erro ao carregar pacientes')
    } finally {
      setLoading(false)
    }
  }

  function openModal(patient = null) {
    // Só permite editar pacientes próprios
    if (patient && !patient.isOwn) {
      toast.error('Você não pode editar pacientes de outros membros')
      return
    }
    setEditingPatient(patient)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingPatient(null)
  }

  async function handleSubmit(data) {
    setSaving(true)
    
    try {
      if (editingPatient) {
        await updatePatient(editingPatient.id, data)
        toast.success('Paciente atualizado')
      } else {
        await createPatient(user.uid, data)
        toast.success('Paciente adicionado')
      }
      
      closeModal()
      loadPatients()
    } catch (error) {
      toast.error(error.message || 'Erro ao salvar paciente')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(patientId) {
    try {
      await deletePatient(patientId)
      setPatients(prev => prev.filter(p => p.id !== patientId))
    } catch (error) {
      throw error
    }
  }

  async function handleAddAlias(patientId, alias) {
    await addPatientAlias(patientId, alias)
    loadPatients()
  }

  async function handleRemoveAlias(patientId, alias) {
    await removePatientAlias(patientId, alias)
    loadPatients()
  }

  async function handleShare(patientId, isShared) {
    await updatePatientSharing(patientId, isShared)
    loadPatients()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-gray-500 mt-1">
            {hasGroup 
              ? 'Seus pacientes e os compartilhados pelo grupo familiar'
              : 'Gerencie os membros da sua família'
            }
          </p>
        </div>
        
        <button onClick={() => openModal()} className="btn-primary">
          <UserPlus className="w-5 h-5" />
          Adicionar Paciente
        </button>
      </div>

      {/* Info sobre compartilhamento */}
      {hasGroup && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900">Grupo Familiar: {familyGroup?.name}</h4>
              <p className="text-sm text-blue-700 mt-1">
                Use o ícone <Lock className="w-4 h-4 inline-block mx-1" /> para tornar um paciente privado ou{' '}
                <Unlock className="w-4 h-4 inline-block mx-1" /> para compartilhar com o grupo.
                Pacientes de outros membros aparecem com destaque.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de pacientes */}
      {patients.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="Nenhum paciente cadastrado"
          description="Adicione os membros da sua família para organizar os documentos médicos de cada um."
          action={
            <button onClick={() => openModal()} className="btn-primary">
              <UserPlus className="w-5 h-5" />
              Adicionar Primeiro Paciente
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map(patient => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onEdit={openModal}
              onDelete={handleDelete}
              onAddAlias={handleAddAlias}
              onRemoveAlias={handleRemoveAlias}
              onShare={handleShare}
              onClick={() => navigate(`/files?patient=${patient.id}`)}
              hasGroup={hasGroup}
              isOwn={patient.isOwn !== false}
            />
          ))}
        </div>
      )}

      {/* Modal de criação/edição */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingPatient ? 'Editar Paciente' : 'Novo Paciente'}
        size="md"
      >
        <PatientForm
          patient={editingPatient}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          loading={saving}
        />
      </Modal>
    </div>
  )
}
