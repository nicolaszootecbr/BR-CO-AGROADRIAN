/**
 * Robust PDF Generation Service for BR-CO AgroAdrian
 * Optimized for Vercel/Vite production builds with memory-safe coordinate bounds.
 */

interface PDFExportOptions {
  filename: string;
  orientation?: 'portrait' | 'landscape';
  format?: string;
  margin?: number | [number, number, number, number];
}

/**
 * Safely load html2pdf in both ESM and CJS production environments
 */
async function loadHtml2Pdf(): Promise<any> {
  try {
    const mod = await import('html2pdf.js');
    const html2pdf = (mod && (mod.default || mod)) as any;
    if (typeof html2pdf === 'function') {
      return html2pdf;
    }
    if (mod && typeof mod.default === 'function') {
      return mod.default;
    }
    return html2pdf;
  } catch (err) {
    console.error('Failed to dynamically load html2pdf.js:', err);
    throw new Error('Falha ao inicializar o motor de PDF.');
  }
}

/**
 * Robustly exports a DOM element to PDF with memory-safe sandbox rendering and fallback
 */
export async function exportElementToPdf(
  sourceElement: HTMLElement,
  options: PDFExportOptions
): Promise<void> {
  const {
    filename,
    orientation = 'landscape',
    format = 'a4',
    margin = 8
  } = options;

  // 1. Wait for fonts to be ready so html2canvas doesn't crash or miss typography
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font wait failures
    }
  }

  // 2. Clone the element into an isolated sandbox positioned at (0, 0) behind the view
  // NOTE: Using top: 0; left: 0 (instead of -99999px) prevents html2canvas from computing
  // giant canvas offsets that exhaust browser RAM and freeze the main thread.
  const targetWidthMm = orientation === 'landscape' ? 297 : 210;
  const targetWidthPx = Math.round(targetWidthMm * 3.7795); // ~1122px landscape, ~794px portrait

  const container = document.createElement('div');
  container.id = `pdf-sandbox-${Date.now()}`;
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = `${targetWidthMm}mm`;
  container.style.minHeight = orientation === 'landscape' ? '210mm' : '297mm';
  container.style.zIndex = '-9999';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'hidden';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  container.style.boxSizing = 'border-box';

  // Clone source DOM
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  clone.style.display = 'block';
  clone.style.visibility = 'visible';
  clone.style.opacity = '1';
  clone.style.width = '100%';
  clone.style.boxSizing = 'border-box';
  clone.style.margin = '0';

  container.appendChild(clone);
  document.body.appendChild(container);

  // Force synchronous layout calculation
  const _reflow = container.offsetHeight;

  try {
    const html2pdf = await loadHtml2Pdf();

    const opt = {
      margin: margin,
      filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 1.5, // 1.5x gives high quality without exhausting browser memory
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        backgroundColor: '#ffffff',
        windowWidth: targetWidthPx
      },
      jsPDF: {
        unit: 'mm',
        format: format,
        orientation: orientation,
        compress: true
      }
    };

    // Timeout race (30s) to prevent hanging UI
    const pdfPromise = html2pdf().set(opt).from(clone).save();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Tempo limite excedido na geração do PDF.')), 30000)
    );

    await Promise.race([pdfPromise, timeoutPromise]);
  } catch (error) {
    console.error('Erro na exportação via html2pdf:', error);
    
    // Fallback: Trigger browser print window with clean styles if html2canvas/jsPDF fails
    const userWantsPrint = window.confirm(
      'Houve uma instabilidade na conversão gráfica do PDF. Deseja abrir a visualização de impressão do navegador para salvar como PDF diretamente?'
    );

    if (userWantsPrint) {
      triggerPrintFallback(clone, orientation);
    } else {
      throw error;
    }
  } finally {
    // Clean up sandbox DOM safely
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    // Ensure body styles were not modified
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.removeProperty('overflow');
    }
  }
}

/**
 * Fallback print function using an isolated hidden iframe
 */
function triggerPrintFallback(contentElement: HTMLElement, orientation: 'portrait' | 'landscape') {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório - BR-CO AgroAdrian</title>
          <style>
            @page {
              size: A4 ${orientation};
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #000;
              background: #fff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            .break-inside-avoid {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          ${contentElement.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1000);
    }, 500);
  } catch (err) {
    console.error('Falha no fallback de impressão:', err);
    window.print();
  }
}
