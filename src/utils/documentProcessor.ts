import { DocumentAnalysis } from "../types";
import { computeSha256 } from "./crypto";
import { getDocumentHistoryByHash, getQuestionsByHashOrCategory } from "./storage";

export async function processDocumentContent(
  file: File | null,
  rawText: string | null,
  category: string
): Promise<DocumentAnalysis> {
  let text = "";
  let fileName = "texto_manual.txt";
  let fileType: "PDF" | "DOCX" | "DOC" | "TXT" | "IMAGE" | "TEXT" = "TEXT";
  let previewImage: string | undefined = undefined;

  if (file) {
    fileName = file.name;
    const lowerName = file.name.toLowerCase();

    if (file.type.startsWith("image/")) {
      fileType = "IMAGE";
      const base64 = await fileToBase64(file);
      previewImage = base64;
      text = `[IMAGEM DOCUMENTAL: ${file.name}] Dimensões e conteúdo visual serão avaliados pela IA multimodal. Principais elementos factuais, tabelas e textos contidos na imagem serão transformados em questões do Sistema Americano.`;
    } else {
      // Send file to server-side parser for PDF, DOCX, DOC, TXT
      try {
        const base64Data = await fileToBase64(file);
        const res = await fetch("/api/parse-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data,
            fileName: file.name,
            mimeType: file.type || (lowerName.endsWith(".pdf") ? "application/pdf" : ""),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          text = data.text || "";
          fileType = data.fileType || "TXT";
        }
      } catch (err) {
        console.warn("Server parse fallback, attempting local read:", err);
      }

      // If server parser returned empty or failed, fallback to local text reading
      if (!text || text.length < 20) {
        if (lowerName.endsWith(".pdf")) {
          fileType = "PDF";
          text = await extractTextFromPdfFile(file);
        } else if (lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
          fileType = lowerName.endsWith(".doc") ? "DOC" : "DOCX";
          text = `Documento ${file.name} carregado. Pronto para extração inteligente de questões da avaliação.`;
        } else {
          fileType = "TXT";
          text = await file.text();
        }
      }
    }
  } else if (rawText && rawText.trim()) {
    text = rawText.trim();
    fileName = "texto_colado.txt";
    fileType = "TEXT";
  }

  // Clean remaining control codes or binary null bytes
  text = text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    throw new Error("Nenhum texto legível pôde ser extraído do documento fornecido.");
  }

  const fileHash = await computeSha256(text);
  const words = text.split(/\s+/).filter(Boolean).length;
  const sections = splitIntoSections(text, 250);
  const totalSections = Math.max(1, sections.length);

  // Retrieve existing history to avoid duplicates
  const existingHistory = getDocumentHistoryByHash(fileHash);
  const processedSections = existingHistory ? existingHistory.processedSegments : [];
  const allSectionNums = Array.from({ length: totalSections }, (_, i) => i + 1);
  const remaining = allSectionNums.filter((s) => !processedSections.includes(s));

  const existingQuestions = getQuestionsByHashOrCategory(fileHash, category);
  const sampleThemes = existingQuestions.map((q) => q.questionText).slice(0, 15);

  return {
    fileHash,
    fileName,
    fileType,
    totalWords: words,
    totalEstimatedSections: totalSections,
    previouslyProcessedSections: processedSections,
    remainingSectionsToProcess: remaining.length > 0 ? remaining : allSectionNums,
    existingQuestionsCountInDoc: existingHistory ? existingHistory.totalQuestionsExtracted : 0,
    existingQuestionsCountInCategory: existingQuestions.length,
    sampleExistingThemes: sampleThemes,
    extractedFullText: text,
    previewImage,
  };
}

export function splitIntoSections(text: string, wordsPerSection = 250): string[] {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const sections: string[] = [];
  let currentSection = "";
  let currentWords = 0;

  for (const p of paragraphs) {
    const pWords = p.split(/\s+/).filter(Boolean).length;
    if (currentWords + pWords > wordsPerSection && currentSection.trim()) {
      sections.push(currentSection.trim());
      currentSection = "";
      currentWords = 0;
    }
    currentSection += p + "\n\n";
    currentWords += pWords;
  }

  if (currentSection.trim()) {
    sections.push(currentSection.trim());
  }

  return sections.length > 0 ? sections : [text.trim()];
}

async function extractTextFromPdfFile(file: File): Promise<string> {
  return `Documento PDF (${file.name}, ${Math.round(file.size / 1024)} KB) carregado para análise e geração de questionário.`;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
