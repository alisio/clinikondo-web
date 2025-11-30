import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useFamily } from '../contexts/FamilyContext'
import { getUserStats, getPatients } from '../services/firestoreService'
import { getVisiblePatients } from '../services/familyService'
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Upload,
  Users,
  HardDrive,
  TrendingUp
} from 'lucide-react'
import Spinner from '../components/ui/Spinner'

// Card de estatística
function StatCard({ icon: Icon, label, value, color, subtext }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    error: 'bg-error-50 text-error-600',
    gray: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{label}</div>
          {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
        </div>
      </div>
    </div>
  )
}

// Card de paciente
function PatientCard({ patient }) {
  const genderIcons = { M: '👨', F: '👩', O: '🧑' }
  
  return (
    <Link 
      to={`/files?patient=${patient.id}`}
      className="card p-4 hover:border-primary-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl">{genderIcons[patient.gender] || '🧑'}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{patient.name}</h3>
          <p className="text-sm text-gray-500">{patient.documentCount || 0} documentos</p>
          {patient.relationship && (
            <span className="badge-primary mt-2">{patient.relationship}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { user, userProfile } = useAuth()
  const { familyGroup } = useFamily()
  const [stats, setStats] = useState(null)
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!user) return
      
      try {
        // Usar getVisiblePatients para incluir pacientes compartilhados do grupo familiar (RF20)
        const [statsData, patientsData] = await Promise.all([
          getUserStats(user.uid),
          getVisiblePatients(user.uid, familyGroup),
        ])
        
        setStats(statsData)
        setPatients(patientsData)
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [user, familyGroup])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-primary-500" />
      </div>
    )
  }

  const displayName = userProfile?.displayName || user?.displayName || 'Usuário'
  const firstName = displayName.split(' ')[0]

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {firstName}! 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Bem-vindo ao seu arquivo médico digital
          </p>
        </div>
        
        <Link to="/processor" className="btn-primary">
          <Upload className="w-5 h-5" />
          Enviar Documentos
        </Link>
      </div>

      {/* Estatísticas */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-500" />
          Estatísticas
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={FileText}
            label="Total de Documentos"
            value={stats?.totalDocuments || 0}
            color="primary"
          />
          <StatCard
            icon={CheckCircle}
            label="Processados"
            value={stats?.completedDocuments || 0}
            color="success"
          />
          <StatCard
            icon={Clock}
            label="Em Processamento"
            value={stats?.pendingDocuments || 0}
            color="warning"
          />
          <StatCard
            icon={AlertCircle}
            label="Precisam Revisão"
            value={stats?.reviewRequired || 0}
            color="error"
          />
        </div>

        {/* Storage */}
        <div className="card p-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <HardDrive className="w-4 h-4" />
              Espaço utilizado
            </div>
            <span className="text-sm font-medium">
              {(stats?.storageUsedMB || 0).toFixed(1)} MB / 1 GB
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-bar-fill"
              style={{ width: `${Math.min((stats?.storageUsedMB || 0) / 1024 * 100, 100)}%` }}
            />
          </div>
        </div>
      </section>

      {/* Pacientes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            Sua Família ({patients.length})
          </h2>
          <Link to="/patients" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Gerenciar →
          </Link>
        </div>

        {patients.length === 0 ? (
          <div className="card p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">
              Nenhum paciente cadastrado
            </h3>
            <p className="text-gray-500 mb-4">
              Cadastre os membros da sua família para organizar os documentos
            </p>
            <Link to="/patients" className="btn-primary">
              Adicionar Paciente
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {patients.slice(0, 8).map(patient => (
              <PatientCard key={patient.id} patient={patient} />
            ))}
            
            {patients.length > 8 && (
              <Link 
                to="/patients"
                className="card p-4 flex items-center justify-center text-primary-600 hover:bg-primary-50 transition-colors"
              >
                Ver todos ({patients.length})
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Ações Rápidas */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          ⚡ Ações Rápidas
        </h2>
        
        <div className="flex flex-wrap gap-3">
          <Link to="/processor" className="btn-primary">
            <Upload className="w-5 h-5" />
            Novo Upload
          </Link>
          
          {stats?.reviewRequired > 0 && (
            <Link to="/files?review=true" className="btn-secondary">
              <AlertCircle className="w-5 h-5" />
              Ver Pendentes ({stats.reviewRequired})
            </Link>
          )}
          
          <Link to="/files" className="btn-ghost">
            <FileText className="w-5 h-5" />
            Buscar Documentos
          </Link>
        </div>
      </section>
    </div>
  )
}
