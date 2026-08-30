import { Quiz, OptionLetter, UserAccount } from "../types";

export interface PerformanceCardData {
  quiz: Quiz;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  user?: UserAccount | null;
  completionDate?: Date;
}

/**
 * Generates an ultra-crisp high-resolution 1200x675 (16:9) performance card image
 * styled with modern dark glassmorphism, glowing gradients, metrics, and branding.
 */
export async function generatePerformanceCardImageBlob(
  data: PerformanceCardData
): Promise<{ blob: Blob; dataUrl: string }> {
  const { quiz, scorePercent, correctCount, totalQuestions, user } = data;
  const errorCount = totalQuestions - correctCount;
  const studentName = user?.displayName || user?.email?.split("@")[0] || "Estudante BandApp";
  const dateStr = (data.completionDate || new Date()).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const width = 1200;
  const height = 675;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas 2d context");
  }

  // 1. Rich Dark Background with subtle ambient gradients
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#090d16");
  bgGrad.addColorStop(0.5, "#0b0f19");
  bgGrad.addColorStop(1, "#020617");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient Color Orbs / Glows
  // Indigo / Purple glow top-left
  const glow1 = ctx.createRadialGradient(200, 150, 20, 200, 150, 450);
  glow1.addColorStop(0, "rgba(99, 102, 241, 0.25)");
  glow1.addColorStop(1, "rgba(99, 102, 241, 0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  // Amber / Gold glow right
  const glow2 = ctx.createRadialGradient(950, 300, 30, 950, 300, 500);
  if (scorePercent >= 80) {
    glow2.addColorStop(0, "rgba(245, 158, 11, 0.22)");
  } else if (scorePercent >= 60) {
    glow2.addColorStop(0, "rgba(99, 102, 241, 0.2)");
  } else {
    glow2.addColorStop(0, "rgba(244, 63, 94, 0.18)");
  }
  glow2.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);

  // 3. Subtle outer border card frame
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 2;
  roundRect(ctx, 30, 30, width - 60, height - 60, 28);
  ctx.stroke();

  // Glass card fill
  ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
  ctx.fill();
  ctx.restore();

  // 4. Header Bar: Logo & App Title & Verified Stamp
  // Brand Icon Circle
  ctx.save();
  const iconGrad = ctx.createLinearGradient(60, 60, 110, 110);
  iconGrad.addColorStop(0, "#4f46e5");
  iconGrad.addColorStop(1, "#f59e0b");
  ctx.fillStyle = iconGrad;
  roundRect(ctx, 60, 60, 52, 52, 16);
  ctx.fill();

  // Sparkle / Star inside icon
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  drawStar(ctx, 86, 86, 4, 14, 6);
  ctx.fill();
  ctx.restore();

  // App Name
  ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("BandApp", 126, 92);

  ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("SISTEMA AMERICANO DE AVALIAÇÃO", 126, 110);

  // Verified Badge Top Right
  ctx.save();
  ctx.fillStyle = "rgba(99, 102, 241, 0.15)";
  ctx.strokeStyle = "rgba(129, 140, 248, 0.4)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, width - 290, 62, 230, 48, 24);
  ctx.fill();
  ctx.stroke();

  ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#a5b4fc";
  ctx.fillText("DESEMPENHO OFICIAL", width - 260, 92);
  ctx.restore();

  // Divider Line
  ctx.strokeStyle = "rgba(51, 65, 85, 0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 136);
  ctx.lineTo(width - 60, 136);
  ctx.stroke();

  // 5. Left Side: Student & Quiz Info
  // Student Name
  ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(studentName, 60, 186);

  // Category Tag Pill
  ctx.save();
  ctx.fillStyle = "rgba(99, 102, 241, 0.2)";
  ctx.strokeStyle = "rgba(129, 140, 248, 0.5)";
  ctx.lineWidth = 1;
  roundRect(ctx, 60, 206, Math.min(320, 20 + quiz.category.length * 10), 32, 10);
  ctx.fill();
  ctx.stroke();

  ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#818cf8";
  ctx.fillText(quiz.category.toUpperCase(), 74, 227);
  ctx.restore();

  // Quiz Title (wrapped cleanly if long)
  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#e2e8f0";
  const truncatedTitle = quiz.title.length > 55 ? quiz.title.slice(0, 52) + "..." : quiz.title;
  ctx.fillText(truncatedTitle, 60, 276);

  // Subtitle / Date
  ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`Concluído em: ${dateStr} • ${totalQuestions} Questões de Múltipla Escolha`, 60, 304);

  // 6. Center-Right: Big Circular Score Display
  const circleCenterX = 920;
  const circleCenterY = 320;
  const circleRadius = 110;

  // Background ring
  ctx.beginPath();
  ctx.arc(circleCenterX, circleCenterY, circleRadius, 0, 2 * Math.PI);
  ctx.strokeStyle = "rgba(30, 41, 59, 0.8)";
  ctx.lineWidth = 16;
  ctx.stroke();

  // Colored progress arc
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (2 * Math.PI * (scorePercent / 100));
  ctx.beginPath();
  ctx.arc(circleCenterX, circleCenterY, circleRadius, startAngle, endAngle);
  
  let scoreColor = "#10b981"; // Emerald
  if (scorePercent < 50) scoreColor = "#f43f5e"; // Rose
  else if (scorePercent < 75) scoreColor = "#f59e0b"; // Amber
  else if (scorePercent < 90) scoreColor = "#6366f1"; // Indigo

  ctx.strokeStyle = scoreColor;
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.stroke();

  // Inner Circle Fill
  ctx.save();
  ctx.beginPath();
  ctx.arc(circleCenterX, circleCenterY, circleRadius - 12, 0, 2 * Math.PI);
  ctx.fillStyle = "rgba(10, 15, 29, 0.95)";
  ctx.fill();

  // Score Number
  ctx.font = "bold 64px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${scorePercent}%`, circleCenterX, circleCenterY - 8);

  // Score Label
  ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("APROVEITAMENTO", circleCenterX, circleCenterY + 36);
  ctx.restore();

  // Rating pill under circle
  let ratingText = "Atenção! Pratique Novamente";
  let ratingBg = "rgba(244, 63, 94, 0.15)";
  let ratingBorder = "rgba(244, 63, 94, 0.4)";
  let ratingColorTxt = "#fda4af";

  if (scorePercent >= 90) {
    ratingText = "Excelente! Domínio Completo";
    ratingBg = "rgba(16, 185, 129, 0.15)";
    ratingBorder = "rgba(16, 185, 129, 0.4)";
    ratingColorTxt = "#6ee7b7";
  } else if (scorePercent >= 70) {
    ratingText = "Muito Bom! Bom Desempenho";
    ratingBg = "rgba(99, 102, 241, 0.15)";
    ratingBorder = "rgba(99, 102, 241, 0.4)";
    ratingColorTxt = "#a5b4fc";
  } else if (scorePercent >= 50) {
    ratingText = "Razoável! Vale a Pena Revisar";
    ratingBg = "rgba(245, 158, 11, 0.15)";
    ratingBorder = "rgba(245, 158, 11, 0.4)";
    ratingColorTxt = "#fcd34d";
  }

  ctx.save();
  ctx.fillStyle = ratingBg;
  ctx.strokeStyle = ratingBorder;
  ctx.lineWidth = 1;
  roundRect(ctx, circleCenterX - 130, circleCenterY + circleRadius + 18, 260, 36, 18);
  ctx.fill();
  ctx.stroke();

  ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = ratingColorTxt;
  ctx.textAlign = "center";
  ctx.fillText(ratingText, circleCenterX, circleCenterY + circleRadius + 41);
  ctx.restore();

  // 7. Left-Bottom Stats Grid (3 Bento Cards)
  const cardY = 345;
  const cardH = 150;
  const cardW = 205;

  // Card 1: Acertos
  drawStatBox(ctx, 60, cardY, cardW, cardH, {
    title: "ACERTOS",
    val: `${correctCount}`,
    sub: `de ${totalQuestions} questões`,
    color: "#34d399",
    bg: "rgba(6, 78, 59, 0.3)",
    border: "rgba(16, 185, 129, 0.4)",
  });

  // Card 2: Erros
  drawStatBox(ctx, 280, cardY, cardW, cardH, {
    title: "ERROS",
    val: `${errorCount}`,
    sub: errorCount === 0 ? "Gabarito Perfeito!" : "Para revisar",
    color: errorCount === 0 ? "#94a3b8" : "#fb7185",
    bg: errorCount === 0 ? "rgba(30, 41, 59, 0.3)" : "rgba(136, 19, 55, 0.3)",
    border: errorCount === 0 ? "rgba(51, 65, 85, 0.4)" : "rgba(244, 63, 94, 0.4)",
  });

  // Card 3: Formato
  drawStatBox(ctx, 500, cardY, cardW, cardH, {
    title: "SISTEMA",
    val: "A • B • C • D",
    sub: "4 Opções por questão",
    color: "#818cf8",
    bg: "rgba(49, 46, 129, 0.3)",
    border: "rgba(99, 102, 241, 0.4)",
  });

  // 8. Bottom Footer Bar: Social Call to Action / Branding Watermark
  ctx.strokeStyle = "rgba(51, 65, 85, 0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, height - 76);
  ctx.lineTo(width - 60, height - 76);
  ctx.stroke();

  ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "left";
  ctx.fillText("ESTUDE E TESTE SEUS CONHECIMENTOS • BANDAPP", 60, height - 48);

  ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#818cf8";
  ctx.textAlign = "right";
  ctx.fillText("bandapp.com.br", width - 60, height - 48);

  // Return Blob and DataURL
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas toBlob failed"));
        return;
      }
      const dataUrl = canvas.toDataURL("image/png");
      resolve({ blob, dataUrl });
    }, "image/png");
  });
}

function drawStatBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cfg: {
    title: string;
    val: string;
    sub: string;
    color: string;
    bg: string;
    border: string;
  }
) {
  ctx.save();
  ctx.fillStyle = cfg.bg;
  ctx.strokeStyle = cfg.border;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.stroke();

  // Title
  ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "left";
  ctx.fillText(cfg.title, x + 20, y + 36);

  // Value
  ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = cfg.color;
  ctx.fillText(cfg.val, x + 20, y + 84);

  // Subtitle
  ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(cfg.sub, x + 20, y + 118);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}
