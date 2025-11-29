import { useState, useCallback } from 'react'
import { Tag, Plus, X, Sparkles, User } from 'lucide-react'
import { addDocumentTag, removeDocumentTag } from '../services/firestoreService'
import { TAG_CONFIG } from '../lib/constants'
import toast from 'react-hot-toast'

/**
 * Componente para exibição de uma tag individual
 */
function TagBadge({ tag, isManual, onRemove, removable = true }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        ${isManual 
          ? 'bg-primary-100 text-primary-700 border border-primary-200' 
          : 'bg-gray-100 text-gray-600 border border-gray-200'
        }
      `}
      title={isManual ? 'Tag manual' : 'Tag automática (IA)'}
    >
      {isManual ? (
        <User className="w-3 h-3" />
      ) : (
        <Sparkles className="w-3 h-3" />
      )}
      <span>{tag}</span>
      {removable && isManual && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(tag)
          }}
          className="ml-0.5 hover:text-primary-900 transition-colors"
          title="Remover tag"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

/**
 * Componente para exibir lista de tags (visualização somente)
 */
export function TagList({ autoTags = [], manualTags = [], maxVisible = 5 }) {
  const [showAll, setShowAll] = useState(false)
  
  const allTags = [
    ...autoTags.map(t => ({ tag: t, isManual: false })),
    ...manualTags.map(t => ({ tag: t, isManual: true })),
  ]
  
  if (allTags.length === 0) {
    return (
      <span className="text-xs text-gray-400 italic">Sem tags</span>
    )
  }
  
  const visibleTags = showAll ? allTags : allTags.slice(0, maxVisible)
  const hiddenCount = allTags.length - maxVisible
  
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visibleTags.map(({ tag, isManual }) => (
        <TagBadge 
          key={`${isManual ? 'manual' : 'auto'}-${tag}`} 
          tag={tag} 
          isManual={isManual}
          removable={false}
        />
      ))}
      {!showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-primary-600 hover:text-primary-700"
        >
          +{hiddenCount} mais
        </button>
      )}
      {showAll && allTags.length > maxVisible && (
        <button
          onClick={() => setShowAll(false)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Ver menos
        </button>
      )}
    </div>
  )
}

/**
 * Componente completo para gerenciamento de tags (RF18)
 * Permite adicionar e remover tags manualmente
 */
export default function TagManager({ 
  documentId, 
  autoTags = [], 
  manualTags = [], 
  onTagsChange,
  compact = false 
}) {
  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [showInput, setShowInput] = useState(false)
  
  const allTagsCount = autoTags.length + manualTags.length
  const canAddMore = allTagsCount < TAG_CONFIG.MAX_TAGS_PER_DOCUMENT
  
  async function handleAddTag(e) {
    e.preventDefault()
    
    if (!newTag.trim()) return
    
    setLoading(true)
    try {
      const addedTag = await addDocumentTag(documentId, newTag)
      toast.success(`Tag "${addedTag}" adicionada`)
      setNewTag('')
      setShowInput(false)
      // Notificar o componente pai com o documentId
      onTagsChange?.(documentId)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }
  
  async function handleRemoveTag(tag) {
    if (!confirm(`Remover a tag "${tag}"?`)) return
    
    try {
      await removeDocumentTag(documentId, tag)
      toast.success('Tag removida')
      // Notificar o componente pai com o documentId
      onTagsChange?.(documentId)
    } catch (error) {
      toast.error(error.message)
    }
  }
  
  if (compact) {
    return (
      <div className="space-y-2">
        <TagList autoTags={autoTags} manualTags={manualTags} maxVisible={3} />
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Tags
          <span className="text-sm font-normal text-gray-500">
            ({allTagsCount}/{TAG_CONFIG.MAX_TAGS_PER_DOCUMENT})
          </span>
        </h4>
      </div>
      
      {/* Tags automáticas */}
      {autoTags.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Extraídas automaticamente
          </p>
          <div className="flex flex-wrap gap-1">
            {autoTags.map(tag => (
              <TagBadge 
                key={`auto-${tag}`} 
                tag={tag} 
                isManual={false}
                removable={false}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Tags manuais */}
      <div>
        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
          <User className="w-3 h-3" />
          Adicionadas por você
        </p>
        <div className="flex flex-wrap gap-1">
          {manualTags.length === 0 ? (
            <span className="text-xs text-gray-400 italic">Nenhuma tag manual</span>
          ) : (
            manualTags.map(tag => (
              <TagBadge 
                key={`manual-${tag}`} 
                tag={tag} 
                isManual={true}
                onRemove={handleRemoveTag}
              />
            ))
          )}
        </div>
      </div>
      
      {/* Adicionar nova tag */}
      {canAddMore && (
        <div>
          {showInput ? (
            <form onSubmit={handleAddTag} className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Digite uma tag..."
                maxLength={TAG_CONFIG.MAX_TAG_LENGTH}
                className="input text-sm flex-1"
                autoFocus
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !newTag.trim()}
                className="btn-primary text-sm px-3"
              >
                {loading ? '...' : 'Adicionar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInput(false)
                  setNewTag('')
                }}
                className="btn-secondary text-sm px-3"
              >
                Cancelar
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
            >
              <Plus className="w-4 h-4" />
              Adicionar tag
            </button>
          )}
        </div>
      )}
      
      {!canAddMore && (
        <p className="text-xs text-warning-600">
          Limite máximo de tags atingido
        </p>
      )}
    </div>
  )
}
