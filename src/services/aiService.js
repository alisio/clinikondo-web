// Serviço de integração com IA (LLM)
// NOTA: Em produção, use um proxy backend para proteger as API keys

import { normalizeTag } from '../lib/constants'

const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'https://api.deepinfra.com/v1/openai'

/**
 * Prompt do sistema para classificação de documentos médicos (RF16 - inclui extração de tags)
 */
const CLASSIFICATION_SYSTEM_PROMPT = `Você é um especialista em classificação de documentos médicos. 
Sua tarefa é analisar o texto extraído de documentos médicos e classificá-los.

Retorne APENAS um JSON válido com a seguinte estrutura:
{
  "classification": {
    "type": "Exame" | "Receita" | "Laudo" | "Vacina" | "Outro",
    "specialty": "Nome da especialidade médica",
    "date": "AAAA-MM-DD" (data encontrada no documento, ou null),
    "confidence": 0-100 (sua confiança na classificação),
    "reasoning": "Breve explicação de 1 linha"
  },
  "patient_names": [
    {
      "name": "Nome completo encontrado",
      "role": "paciente" | "physician" | "responsavel",
      "confidence": 0-100
    }
  ],
  "key_findings": ["Achado 1", "Achado 2"],
  "tags": ["palavra-chave1", "palavra-chave2", ...],
  "document_metadata": {
    "extraction_quality": "high" | "medium" | "low",
    "is_handwritten": true | false,
    "language": "pt-BR"
  }
}

Regras:
- "type" deve ser uma das opções listadas
- "specialty" deve ser uma especialidade médica válida (Cardiologia, Pediatria, etc)
- Sempre tente encontrar uma data no documento
- "patient_names" deve listar todas as pessoas mencionadas, identificando o papel de cada uma
- "tags" DEVE incluir palavras-chave relevantes para busca futura:
  * Medicamentos mencionados (ex: dipirona, amoxicilina, losartana)
  * Sintomas (ex: febre, tosse, dor de cabeça)
  * Diagnósticos (ex: gripe, diabetes, hipertensão)
  * Procedimentos (ex: hemograma, raio-x, eletrocardiograma)
  * Termos médicos relevantes do documento
  * Para receitas: SEMPRE inclua os nomes dos medicamentos prescritos
  * Máximo de 15 tags por documento
- Seja conservador com a confiança se o texto estiver incompleto ou ilegível
- Responda APENAS com o JSON, sem texto adicional`

/**
 * Prompt para extração de texto via Vision
 */
const VISION_SYSTEM_PROMPT = `Você é um OCR especializado em documentos médicos brasileiros.
Extraia TODO o texto visível na imagem, mantendo a estrutura e formatação original.
Inclua cabeçalhos, rodapés, assinaturas, carimbos e anotações manuscritas.
Se houver texto manuscrito, transcreva da melhor forma possível.
Retorne apenas o texto extraído, sem comentários adicionais.`

/**
 * Classifica um documento médico usando LLM
 * @param {string} text - Texto extraído do documento
 * @returns {Promise<Object>} Classificação estruturada
 */
export async function classifyDocument(text) {
  // Validação básica
  if (!text || text.trim().length < 10) {
    throw new Error('Texto muito curto para classificação')
  }

  try {
    const response = await fetch(`${AI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Em produção, use proxy backend para proteger a key
        'Authorization': `Bearer ${import.meta.env.VITE_LLM_API_KEY || 'demo-key'}`,
      },
      body: JSON.stringify({
        model: import.meta.env.VITE_AI_CLASSIFY_MODEL || 'meta-llama/Meta-Llama-3.1-8B-Instruct',
        messages: [
          { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
          { role: 'user', content: `Classifique este documento médico:\n\n${text.slice(0, 4000)}` },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    // Parse do JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Resposta inválida da IA')
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Erro na classificação:', error)
    
    // Retorna classificação padrão em caso de erro
    return {
      classification: {
        type: 'Outro',
        specialty: 'Geral',
        date: null,
        confidence: 0,
        reasoning: 'Não foi possível classificar automaticamente',
      },
      patient_names: [],
      key_findings: [],
      tags: [], // RF16: tags vazias em caso de erro
      document_metadata: {
        extraction_quality: 'low',
        is_handwritten: false,
        language: 'pt-BR',
      },
    }
  }
}

/**
 * Processa e normaliza as tags extraídas pela IA (RF16)
 * @param {string[]} rawTags - Tags brutas da IA
 * @returns {string[]} - Tags normalizadas e válidas
 */
export function processExtractedTags(rawTags) {
  if (!Array.isArray(rawTags)) return []
  
  const processed = rawTags
    .map(tag => normalizeTag(tag))
    .filter(tag => tag.length >= 2 && tag.length <= 50)
    .slice(0, 15) // Máximo 15 tags automáticas
  
  // Remove duplicatas
  return [...new Set(processed)]
}

/**
 * Extrai texto de imagem usando Vision LLM
 * @param {string} base64Image - Imagem em base64
 * @returns {Promise<string>} Texto extraído
 */
export async function extractTextWithVision(base64Image) {
  try {
    const response = await fetch(`${AI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_LLM_API_KEY || 'demo-key'}`,
      },
      body: JSON.stringify({
        model: import.meta.env.VITE_AI_VISION_MODEL || 'llava-hf/llava-1.5-7b-hf',
        messages: [
          { role: 'system', content: VISION_SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'Extraia todo o texto desta imagem de documento médico:' },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Erro na extração via Vision:', error)
    throw new Error('Não foi possível extrair texto da imagem')
  }
}

/**
 * Processa documento completo (extração + classificação)
 * @param {File} file 
 * @param {Function} onProgress - Callback de progresso
 */
export async function processDocument(file, onProgress) {
  const isPDF = file.type === 'application/pdf'
  const isImage = file.type.startsWith('image/')
  
  let extractedText = ''
  let usedVision = false

  // Etapa 1: Extração
  onProgress?.({ stage: 'extracting', progress: 10 })

  try {
    if (isPDF) {
      // Tenta extrair texto nativo do PDF
      const { extractTextFromPDF, pdfToImage, fileToBase64 } = await import('./extractionService')
      
      console.log('[AI] Iniciando extração de texto do PDF...')
      const { text, hasText, error } = await extractTextFromPDF(file)
      console.log('[AI] Extração PDF:', { hasText, textLength: text?.length, error })
      
      if (hasText && text) {
        extractedText = text
      } else {
        // PDF sem texto ou erro - usa Vision
        console.log('[AI] PDF sem texto legível, usando Vision...')
        onProgress?.({ stage: 'extracting', progress: 20, message: 'Usando IA para ler documento...' })
        
        try {
          const imageBase64 = await pdfToImage(file)
          extractedText = await extractTextWithVision(imageBase64)
          usedVision = true
        } catch (visionError) {
          console.error('[AI] Erro no Vision:', visionError)
          throw new Error('Não foi possível extrair texto do documento')
        }
      }
    } else if (isImage) {
      // Imagem - sempre usa Vision
      console.log('[AI] Processando imagem com Vision...')
      const { fileToBase64 } = await import('./extractionService')
      const imageBase64 = await fileToBase64(file)
      extractedText = await extractTextWithVision(imageBase64)
      usedVision = true
    } else {
      throw new Error('Tipo de arquivo não suportado')
    }
  } catch (extractionError) {
    console.error('[AI] Erro na extração:', extractionError)
    throw new Error(`Falha na extração: ${extractionError.message}`)
  }

  if (!extractedText || extractedText.trim().length < 10) {
    throw new Error('Não foi possível extrair texto suficiente do documento')
  }

  onProgress?.({ stage: 'extracting', progress: 40 })

  // Etapa 2: Classificação
  onProgress?.({ stage: 'classifying', progress: 50 })
  
  console.log('[AI] Iniciando classificação...')
  const classification = await classifyDocument(extractedText)
  console.log('[AI] Classificação concluída:', classification?.classification?.type)
  
  onProgress?.({ stage: 'classifying', progress: 80 })

  return {
    extractedText,
    classification,
    usedVision,
    processingDetails: {
      textLength: extractedText.length,
      extractionMethod: usedVision ? 'vision' : 'native',
    },
  }
}
