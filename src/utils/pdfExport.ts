import { jsPDF } from "jspdf";
import { Quiz, OptionLetter } from "../types";

export interface QuizPdfExportOptions {
  quiz: Quiz;
  scorePercent: number;
  correctCount: number;
  userAnswers: Record<number, OptionLetter>;
  userEmail?: string;
}

export function exportQuizResultToPdf({
  quiz,
  scorePercent,
  correctCount,
  userAnswers,
  userEmail,
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

  let currentY = margin;

  // Helper to add new page if needed
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 16) {
      doc.addPage();
      currentY = margin + 6;
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
  doc.text("BandApp • Relatório de Desempenho do Quiz", margin + 5, currentY + 9);

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
    doc.text(`Estudante: ${userEmail}`, margin + contentWidth - 5, currentY + 16, { align: "right" });
  }

  currentY += 27;

  // Quiz Overview Box
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, currentY, contentWidth, 36, 3, 3, "FD");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // Slate 900
  const splitTitle = doc.splitTextToSize(quiz.title, contentWidth - 46);
  doc.text(splitTitle[0] || quiz.title, margin + 5, currentY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`Categoria: ${quiz.category}  |  Origem: ${quiz.sourceFileName || "Documento BandApp"}`, margin + 5, currentY + 15);

  const questions = quiz.questions || [];
  const totalQuestions = questions.length;
  const errorCount = totalQuestions - correctCount;

  // Rating Badge in Overview
  let statusText = "Excelente!";
  let badgeColor: [number, number, number] = [16, 185, 129]; // emerald
  if (scorePercent < 50) {
    statusText = "Revisão Necessária";
    badgeColor = [225, 29, 72]; // rose
  } else if (scorePercent < 70) {
    statusText = "Bom Desempenho";
    badgeColor = [245, 158, 11]; // amber
  }

  // Score Highlight Circle / Box on the right
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(margin + contentWidth - 36, currentY + 4, 31, 28, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(`${scorePercent}%`, margin + contentWidth - 20.5, currentY + 16, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("APROVEITAMENTO", margin + contentWidth - 20.5, currentY + 24, { align: "center" });

  // Stats row underneath overview
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Acertos: ${correctCount}/${totalQuestions}`, margin + 5, currentY + 28);
  doc.setTextColor(225, 29, 72);
  doc.text(`Erros: ${errorCount}`, margin + 45, currentY + 28);
  doc.setTextColor(99, 102, 241);
  doc.text(`Formato: 4 Opções (A, B, C, D)`, margin + 75, currentY + 28);
  doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.text(`Classificação: ${statusText}`, margin + 130, currentY + 28);

  currentY += 41;

  // Section Header: Questões e Gabarito
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Gabarito Detalhado e Justificativas das Questões", margin, currentY);

  currentY += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 5;

  // Render each question
  questions.forEach((q, idx) => {
    const userChoice = userAnswers[idx];
    const isCorrect = userChoice && userChoice.toUpperCase() === q.correctOption.toUpperCase();

    // Prepare texts for height calculation
    const questionHeader = `Questão ${idx + 1} de ${totalQuestions} • Nível: ${q.difficulty || "Médio"}`;
    const questionTextLines = doc.splitTextToSize(q.questionText, contentWidth - 10);

    const optionALines = doc.splitTextToSize(`A) ${q.optionA}`, contentWidth - 14);
    const optionBLines = doc.splitTextToSize(`B) ${q.optionB}`, contentWidth - 14);
    const optionCLines = doc.splitTextToSize(`C) ${q.optionC}`, contentWidth - 14);
    const optionDLines = doc.splitTextToSize(`D) ${q.optionD}`, contentWidth - 14);

    const explanationLines = doc.splitTextToSize(`Fundamentação: ${q.explanation}`, contentWidth - 12);
    const sourceLines = q.sourceExcerpt
      ? doc.splitTextToSize(`Referência: "${q.sourceExcerpt}"`, contentWidth - 12)
      : [];

    const optionsHeight =
      (optionALines.length + optionBLines.length + optionCLines.length + optionDLines.length) * 4.2 + 8;
    const explanationHeight = (explanationLines.length + sourceLines.length) * 3.8 + 8;
    const cardHeight = 12 + questionTextLines.length * 4.2 + optionsHeight + explanationHeight + 8;

    checkPageBreak(Math.min(cardHeight, 65));

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
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(questionHeader, margin + 4, innerY);

    // Status Badge
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    if (isCorrect) {
      doc.setTextColor(21, 128, 61); // emerald-700
      doc.text("✓ ACERTOU", margin + contentWidth - 4, innerY, { align: "right" });
    } else {
      doc.setTextColor(190, 18, 60); // rose-700
      doc.text("✗ ERROU", margin + contentWidth - 4, innerY, { align: "right" });
    }

    innerY += 5;

    // Question Statement
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(questionTextLines, margin + 4, innerY);
    innerY += questionTextLines.length * 4.2 + 2;

    // Render Options
    const optionsData: { letter: OptionLetter; lines: string[]; isTargetCorrect: boolean; isChosen: boolean }[] = [
      { letter: "A", lines: optionALines, isTargetCorrect: q.correctOption.toUpperCase() === "A", isChosen: userChoice === "A" },
      { letter: "B", lines: optionBLines, isTargetCorrect: q.correctOption.toUpperCase() === "B", isChosen: userChoice === "B" },
      { letter: "C", lines: optionCLines, isTargetCorrect: q.correctOption.toUpperCase() === "C", isChosen: userChoice === "C" },
      { letter: "D", lines: optionDLines, isTargetCorrect: q.correctOption.toUpperCase() === "D", isChosen: userChoice === "D" },
    ];

    optionsData.forEach((opt) => {
      doc.setFontSize(8);
      if (opt.isTargetCorrect) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(5, 150, 105); // emerald-600
        const tag = opt.isChosen ? " [Sua Escolha & Gabarito Oficial]" : " [Gabarito Oficial]";
        doc.text(opt.lines[0] + tag, margin + 6, innerY);
      } else if (opt.isChosen) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(225, 29, 72); // rose-600
        doc.text(opt.lines[0] + " [Sua Escolha - Incorreta]", margin + 6, innerY);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(opt.lines[0], margin + 6, innerY);
      }

      // If option has multiple wrapped lines
      if (opt.lines.length > 1) {
        for (let l = 1; l < opt.lines.length; l++) {
          innerY += 3.8;
          doc.text(opt.lines[l], margin + 10, innerY);
        }
      }

      innerY += 4.2;
    });

    innerY += 2;

    // Explanation Box inside Card
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    const explBoxHeight = (explanationLines.length + sourceLines.length) * 3.8 + 5;
    doc.roundedRect(margin + 3, innerY, contentWidth - 6, explBoxHeight, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(explanationLines, margin + 5, innerY + 3.8);

    if (sourceLines.length > 0) {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text(sourceLines, margin + 5, innerY + 3.8 + explanationLines.length * 3.8);
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
    doc.text("BandApp • Sistema de Avaliação Americana (Gabarito Oficial)", margin, pageHeight - 6);
    doc.text(`Página ${p} de ${totalPages}`, margin + contentWidth, pageHeight - 6, { align: "right" });
  }

  // Trigger download
  const sanitizedTitle = quiz.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 35);
  doc.save(`bandapp_resultado_${sanitizedTitle}.pdf`);
}
