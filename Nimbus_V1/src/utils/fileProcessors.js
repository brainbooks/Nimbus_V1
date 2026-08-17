import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extracts text from an image file using Tesseract.js
 * @param {File} imageFile 
 * @returns {Promise<string>} Extracted text
 */
export const extractTextFromImage = async (imageFile) => {
  try {
    const result = await Tesseract.recognize(
      imageFile,
      'eng',
      { logger: m => console.log(m) }
    );
    return result.data.text;
  } catch (error) {
    console.error("OCR Error:", error);
    return "";
  }
};

/**
 * Extracts text from a PDF file using pdfjs-dist
 * @param {File} pdfFile 
 * @returns {Promise<string>} Extracted text
 */
export const extractTextFromPDF = async (pdfFile) => {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + "\n";
    }
    
    return fullText;
  } catch (error) {
    console.error("PDF Extraction Error:", error);
    return "";
  }
};
