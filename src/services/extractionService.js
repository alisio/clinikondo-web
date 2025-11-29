// Serviço de extração de texto de PDFs e imagens
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configurar worker do PDF.js usando import local (Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

/**
 * Extrai texto de um PDF
 * @param {File} file - Arquivo PDF
 * @returns {Promise<{text: string, hasText: boolean}>}
 */
export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    
    // Timeout para evitar travamento
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    
    // Adiciona timeout de 30 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout ao carregar PDF')), 30000)
    )
    
    const pdf = await Promise.race([loadingTask.promise, timeoutPromise])
    
    let fullText = ''
    
    // Extrai texto de cada página
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ')
      fullText += pageText + '\n'
    }
    
    const cleanedText = fullText.trim()
    
    return {
      text: cleanedText,
      hasText: cleanedText.length > 50, // Considera válido se tem mais de 50 caracteres
      pageCount: pdf.numPages,
    }
  } catch (error) {
    console.error('Erro ao extrair texto do PDF:', error)
    // Retorna sem texto para forçar uso de Vision
    return {
      text: '',
      hasText: false,
      pageCount: 0,
      error: error.message,
    }
  }
}

/**
 * Converte arquivo para base64
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Converte primeira página do PDF para imagem
 * @param {File} file
 * @returns {Promise<string>} Base64 da imagem
 */
export async function pdfToImage(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(1)
    
    const scale = 2 // Alta resolução
    const viewport = page.getViewport({ scale })
    
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height
    
    await page.render({
      canvasContext: context,
      viewport,
    }).promise
    
    // Retorna como base64 PNG
    const dataUrl = canvas.toDataURL('image/png')
    return dataUrl.split(',')[1]
  } catch (error) {
    console.error('Erro ao converter PDF para imagem:', error)
    throw new Error('Não foi possível converter o PDF')
  }
}

/**
 * Determina o melhor método de extração
 */
export function getExtractionMethod(file) {
  const isPDF = file.type === 'application/pdf'
  const isImage = file.type.startsWith('image/')
  
  if (isPDF) return 'pdf'
  if (isImage) return 'vision'
  
  return 'unsupported'
}
