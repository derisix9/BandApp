import { jsPDF } from "jspdf";
import { Quiz, OptionLetter } from "../types";
import {
  getPointsPerQuestion,
  calculateQuizPoints,
  formatQuizPoints,
} from "./scoring";

export interface QuizPdfExportOptions {
  quiz: Quiz;
  scorePercent: number;
  correctCount: number;
  userAnswers: Record<number, OptionLetter>;
  userEmail?: string;
  earnedPoints?: number;
  pointsPerQuestion?: number;
}

export function exportQuizResultToPdf({
  quiz,
  scorePercent,
  correctCount,
  userAnswers,
  userEmail,
  earnedPoints,
  pointsPerQuestion,
}: QuizPdfExportOptions): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const footerReservedHeight = 14;

  let currentY = margin;

  // Helper to add new page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - footerReservedHeight) {
      doc.addPage();
      currentY = margin + 4;
      return true;
    }
    return false;
  };

  // Header Bar with Brand & Date
  doc.setFillColor(30, 27, 75); // Indigo 950
  doc.roundedRect(margin, currentY, contentWidth, 22, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("BandApp • Relatorio de Desempenho do Quiz", margin + 5, currentY + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(199, 210, 254); // Indigo 200
  const dateStr = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Emitido em: ${dateStr}`, margin + 5, currentY + 16);

  if (userEmail) {
    const userEmailLines = doc.splitTextToSize(`Estudante: ${userEmail}`, contentWidth / 2);
    doc.text(userEmailLines[0] || `Estudante: ${userEmail}`, margin + contentWidth - 5, currentY + 16, { align: "right" });
  }

  currentY += 26;

  // Rating Badge in Overview
  let statusText = "Excelente!";
  let badgeColor: [number, number, number] = [16, 185, 129]; // emerald
  if (scorePercent < 50) {
    statusText = "Revisao Necessaria";
    badgeColor = [225, 29, 72]; // rose
  } else if (scorePercent < 70) {
    statusText = "Bom Desempenho";
    badgeColor = [245, 158, 11]; // amber
  }

  const questions = quiz.questions || [];
  const totalQuestions = questions.length;
  const errorCount = totalQuestions - correctCount;
  const ptsPerQ = pointsPerQuestion ?? getPointsPerQuestion(totalQuestions);
  const totalRoundPts = earnedPoints ?? calculateQuizPoints(correctCount, totalQuestions);

  // Measure title & category for dynamic header box
  const availableHeaderTitleWidth = contentWidth - 42;
  const titleLines = doc.splitTextToSize(quiz.title || "Questionario", availableHeaderTitleWidth);
  const categoryStr = `Categoria: ${quiz.category || "Geral"}`;
  const originStr = `Origem: ${quiz.sourceFileName || "Documento BandApp"}`;
  const subHeaderLines = doc.splitTextToSize(`${categoryStr}  |  ${originStr}`, availableHeaderTitleWidth);

  const overviewBoxHeight = Math.max(38, 22 + (titleLines.length + subHeaderLines.length) * 4);

  // Quiz Overview Box
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, currentY, contentWidth, overviewBoxHeight, 3, 3, "FD");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Slate 900
  let topTextY = currentY + 7;
  titleLines.forEach((tLine: string) => {
    doc.text(tLine, margin + 5, topTextY);
    topTextY += 4.5;
  });

  // Category and origin
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  subHeaderLines.forEach((sLine: string) => {
    doc.text(sLine, margin + 5, topTextY);
    topTextY += 3.8;
  });

  // Score Highlight Box on the right
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(margin + contentWidth - 34, currentY + 4, 30, 28, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(`${scorePercent}%`, margin + contentWidth - 19, currentY + 15, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("APROVEITAMENTO", margin + contentWidth - 19, currentY + 22, { align: "center" });

  // Stats row inside overview box
  const statsRowY = currentY + overviewBoxHeight - 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Acertos: ${correctCount}/${totalQuestions}`, margin + 5, statsRowY);
  doc.setTextColor(225, 29, 72);
  doc.text(`Erros: ${errorCount}`, margin + 42, statsRowY);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text(`Pontos da Rodada: +${formatQuizPoints(totalRoundPts)} pts`, margin + 70, statsRowY);
  doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.text(`Classificacao: ${statusText}`, margin + contentWidth - 40, statsRowY);

  currentY += overviewBoxHeight + 5;

  // Section Header: Questões e Gabarito
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("Gabarito Detalhado e Justificativas das Questoes", margin, currentY);

  currentY += 3;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 5;

  // Safe inner card width
  const innerCardWidth = contentWidth - 8;
  const innerTextWidth = contentWidth - 12;

  // Render each question card with strict wrapping and boundary safety
  questions.forEach((q, idx) => {
    const userChoice = userAnswers[idx];
    const isCorrect = userChoice && userChoice.toUpperCase() === (q.correctOption || "").toUpperCase();

    const questionHeader = `Questao ${idx + 1} de ${totalQuestions} • Nivel: ${q.difficulty || "Medio"}`;
    const questionTextLines = doc.splitTextToSize(q.questionText || "", innerTextWidth);

    // Prepare option strings with tags ATTACHED BEFORE wrapping so no text ever overflows!
    const formatOptionString = (letter: OptionLetter, text: string) => {
      const isTarget = (q.correctOption || "").toUpperCase() === letter;
      const isChosen = userChoice === letter;
      let tag = "";
      if (isTarget && isChosen) {
        tag = "  [Sua Escolha & Gabarito Oficial]";
      } else if (isTarget) {
        tag = "  [Gabarito Oficial]";
      } else if (isChosen) {
        tag = "  [Sua Escolha - Incorreta]";
      }
      return `${letter}) ${text || ""}${tag}`;
    };

    const optALines = doc.splitTextToSize(formatOptionString("A", q.optionA), innerTextWidth);
    const optBLines = doc.splitTextToSize(formatOptionString("B", q.optionB), innerTextWidth);
    const optCLines = doc.splitTextToSize(formatOptionString("C", q.optionC), innerTextWidth);
    const optDLines = doc.splitTextToSize(formatOptionString("D", q.optionD), innerTextWidth);

    const totalOptionLinesCount = optALines.length + optBLines.length + optCLines.length + optDLines.length;

    const explanationText = q.explanation ? `Fundamentacao: ${q.explanation}` : "";
    const explanationLines = explanationText ? doc.splitTextToSize(explanationText, innerTextWidth - 4) : [];
    
    const sourceText = q.sourceExcerpt ? `Referencia: "${q.sourceExcerpt}"` : "";
    const sourceLines = sourceText ? doc.splitTextToSize(sourceText, innerTextWidth - 4) : [];

    const explanationBoxHeight =
      explanationLines.length > 0 || sourceLines.length > 0
        ? (explanationLines.length + sourceLines.length) * 3.8 + 6
        : 0;

    // Calculate total exact height needed for this card
    const cardHeight =
      8 + // header padding
      questionTextLines.length * 4.2 +
      4 + // gap
      totalOptionLinesCount * 4.0 +
      4 + // gap
      explanationBoxHeight +
      4; // bottom padding

    checkPageBreak(cardHeight);

    const cardStartY = currentY;

    // Card background
    if (isCorrect) {
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.setDrawColor(187, 247, 208); // emerald-200
    } else {
      doc.setFillColor(255, 241, 242); // rose-50
      doc.setDrawColor(254, 205, 211); // rose-200
    }

    doc.roundedRect(margin, cardStartY, contentWidth, cardHeight, 2.5, 2.5, "FD");

    // Header inside card
    let innerY = cardStartY + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(questionHeader, margin + 4, innerY);

    // Status Pill on top right of the card
    const badgeText = isCorrect ? "ACERTOU" : "ERROU";
    if (isCorrect) {
      doc.setFillColor(209, 250, 229); // emerald-100
      doc.setDrawColor(16, 185, 129); // emerald-500
      doc.roundedRect(margin + contentWidth - 24, innerY - 3.5, 20, 5, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(5, 150, 105);
      doc.text(badgeText, margin + contentWidth - 14, innerY - 0.2, { align: "center" });
    } else {
      doc.setFillColor(255, 228, 230); // rose-100
      doc.setDrawColor(225, 29, 72); // rose-500
      doc.roundedRect(margin + contentWidth - 24, innerY - 3.5, 20, 5, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(225, 29, 72);
      doc.text(badgeText, margin + contentWidth - 14, innerY - 0.2, { align: "center" });
    }

    innerY += 4.5;

    // Question Statement Lines
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    questionTextLines.forEach((qLine: string) => {
      doc.text(qLine, margin + 4, innerY);
      innerY += 4.2;
    });

    innerY += 1.5;

    // Render Options A, B, C, D
    const renderOptionBlock = (letter: OptionLetter, lines: string[]) => {
      const isTarget = (q.correctOption || "").toUpperCase() === letter;
      const isChosen = userChoice === letter;

      doc.setFontSize(7.5);
      if (isTarget) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(5, 150, 105); // emerald-600
      } else if (isChosen) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(225, 29, 72); // rose-600
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105); // slate-600
      }

      lines.forEach((lineStr: string) => {
        doc.text(lineStr, margin + 5, innerY);
        innerY += 4.0;
      });
    };

    renderOptionBlock("A", optALines);
    renderOptionBlock("B", optBLines);
    renderOptionBlock("C", optCLines);
    renderOptionBlock("D", optDLines);

    innerY += 1.5;

    // Explanation Box inside Card
    if (explanationBoxHeight > 0) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin + 3, innerY, contentWidth - 6, explanationBoxHeight, 2, 2, "FD");

      let explLineY = innerY + 3.8;
      if (explanationLines.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        explanationLines.forEach((el: string) => {
          doc.text(el, margin + 5, explLineY);
          explLineY += 3.8;
        });
      }

      if (sourceLines.length > 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        sourceLines.forEach((sl: string) => {
          doc.text(sl, margin + 5, explLineY);
          explLineY += 3.8;
        });
      }
    }

    currentY = cardStartY + cardHeight + 4;
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 10, margin + contentWidth, pageHeight - 10);
    doc.text("BandApp • Sistema de Avaliacao Americana (Gabarito Oficial)", margin, pageHeight - 6);
    doc.text(`Pagina ${p} de ${totalPages}`, margin + contentWidth, pageHeight - 6, { align: "right" });
  }

  // Trigger download
  const sanitizedTitle = (quiz.title || "quiz")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 35);

  doc.save(`bandapp_resultado_${sanitizedTitle}.pdf`);
}
