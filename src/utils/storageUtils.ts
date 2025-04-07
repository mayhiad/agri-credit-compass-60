import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { Document, Packer, Paragraph, TextRun } from "docx";

/**
 * Uploads a file to Supabase storage.
 * @param file The file to upload.
 * @param userId The ID of the user uploading the file.
 * @returns The path to the uploaded file in Supabase storage, or null if the upload fails.
 */
export const uploadFileToStorage = async (file: File, userId: string): Promise<string | null> => {
  try {
    const filePath = `uploads/${userId}/${uuidv4()}-${file.name}`;
    
    const { data, error } = await supabase.storage
      .from('saps-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) {
      console.error("Fájl feltöltési hiba:", error);
      return null;
    }
    
    console.log("Fájl sikeresen feltöltve:", data);
    return filePath;
  } catch (error) {
    console.error("Fájl feltöltési hiba:", error);
    return null;
  }
};

/**
 * Generates a URL for a file stored in Supabase storage.
 * @param filePath The path to the file in Supabase storage.
 * @returns The public URL for the file.
 */
export const generateStorageUrl = (filePath: string): string => {
  const { data } = supabase
    .storage
    .from('saps-documents')
    .getPublicUrl(filePath)
  
  return data.publicUrl;
};

/**
 * Converts a PDF file to images, processing all pages.
 * @param file The PDF file to convert.
 * @param maxPages Maximum number of pages to convert (default: 5)
 * @returns A Promise resolving to an array of image data objects.
 */
export const convertPdfToImages = async (file: File, maxPages: number = 5): Promise<Array<{blob: Blob, base64: string}> | null> => {
  try {
    console.log(`🔍 PDF konvertálása képekké kezdődik, max ${maxPages} oldal...`);
    
    // Load the PDF.js library
    const pdfjsLib = await import('pdfjs-dist');
    // @ts-ignore
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;
    
    // Read the file as an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument(typedArray);
    const pdf = await loadingTask.promise;
    
    // Determine how many pages to process
    const pageCount = pdf.numPages;
    const pagesToProcess = Math.min(pageCount, maxPages);
    
    console.log(`📄 PDF oldalak száma: ${pageCount}, feldolgozandó: ${pagesToProcess}`);
    
    // Array to store the results
    const result: Array<{blob: Blob, base64: string}> = [];
    
    // Process each page
    for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
      console.log(`⏳ ${pageNum}. oldal feldolgozása...`);
      
      // Get the page
      const page = await pdf.getPage(pageNum);
      
      // Set the scale for rendering (adjust DPI here)
      const viewport = page.getViewport({ scale: 1.5 });
      
      // Create a canvas element to render the page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        console.error(`❌ Nem sikerült a canvas kontextus létrehozása az oldalhoz: ${pageNum}`);
        continue;
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render the page onto the canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      // Convert the canvas to a Blob (JPEG format)
      const blob = await new Promise<Blob>((resolve) => {
        let quality = 0.92;  // Start with high quality
        
        const convertWithQuality = (q: number) => {
          canvas.toBlob((b) => {
            if (b && b.size > 10 * 1024 * 1024) {  // If larger than 10MB
              if (q > 0.5) {  // Don't go below 0.5 quality
                console.log(`⚠️ Kép túl nagy (${(b.size/1024/1024).toFixed(2)}MB), minőség csökkentése: ${q} -> ${q-0.1}`);
                convertWithQuality(q - 0.1);
              } else {
                console.log(`🔍 Minőség limit elérve (${q}), eredmény: ${(b.size/1024/1024).toFixed(2)}MB`);
                resolve(b);
              }
            } else if (b) {
              console.log(`✅ Kép optimalizálva: ${(b.size/1024/1024).toFixed(2)}MB, minőség: ${q}`);
              resolve(b);
            } else {
              console.error(`❌ Blob konvertálás sikertelen`);
              // Return an empty blob if conversion fails
              resolve(new Blob([], { type: 'image/jpeg' }));
            }
          }, 'image/jpeg', q);
        };
        
        convertWithQuality(quality);
      });
      
      // Convert to base64 for API
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Remove the data URL prefix (e.g., 'data:image/jpeg;base64,')
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.readAsDataURL(blob);
      });
      
      result.push({ blob, base64 });
      console.log(`✅ ${pageNum}. oldal sikeresen feldolgozva`);
    }
    
    console.log(`🎉 PDF konvertálás befejezve, ${result.length} oldal feldolgozva`);
    return result;
  } catch (error) {
    console.error("❌ Hiba a PDF képekké konvertálása során:", error);
    return null;
  }
};

/**
 * Converts the first page of a PDF to an image.
 * @param file The PDF file to convert.
 * @returns A Promise resolving to a Blob containing the image, or null if conversion fails.
 */
export const convertPdfFirstPageToImage = async (file: File): Promise<{ blob: Blob, base64: string } | null> => {
  try {
    const imageResults = await convertPdfToImages(file, 1);
    
    if (imageResults && imageResults.length > 0) {
      return imageResults[0];
    }
    
    return null;
  } catch (error) {
    console.error("Hiba a PDF kép konvertálása során:", error);
    return null;
  }
};

/**
 * Extracts text from a PDF file using PDF.js.
 * @param file The PDF file to extract text from.
 * @returns The extracted text as a string, or null if extraction fails.
 */
export const extractTextFromPdf = async (file: File): Promise<string | null> => {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    // @ts-ignore
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;
    
    const fileReader = new FileReader();
    
    return new Promise((resolve, reject) => {
      fileReader.onload = async () => {
        try {
          const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          let text = "";
          
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => {
              // Check if item has str property (TextItem) before accessing it
              return 'str' in item ? item.str : '';
            }).join(" ") + "\n";
          }
          
          resolve(text);
        } catch (error) {
          console.error("PDF feldolgozási hiba:", error);
          reject(null);
        }
      };
      
      fileReader.onerror = () => {
        reject(null);
      };
      
      fileReader.readAsArrayBuffer(file);
    });
  } catch (error) {
    console.error("PDF feldolgozási hiba:", error);
    return null;
  }
};

/**
 * Saves OCR text to a Word document in Supabase storage.
 * @param ocrText The OCR text to save.
 * @param fileName The name of the file.
 * @param userId The ID of the user saving the document.
 * @param ocrLogId The ID of the OCR log.
 * @returns The URL of the saved Word document in Supabase storage, or null if saving fails.
 */
export const saveOcrTextToWordDocument = async (
  ocrText: string, 
  fileName: string, 
  userId: string, 
  ocrLogId?: string
): Promise<string | null> => {
  try {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            children: [new TextRun(ocrText)],
          }),
        ],
      }],
    });
    
    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    
    const filePath = `ocr-documents/${userId}/${uuidv4()}-${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('saps-documents')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      
    if (error) {
      console.error("Word dokumentum feltöltési hiba:", error);
      return null;
    }
    
    console.log("Word dokumentum sikeresen feltöltve:", data);
    
    const wordDocumentUrl = generateStorageUrl(filePath);
    
    if (ocrLogId) {
      const { data: updateData, error: updateError } = await supabase
        .from('document_ocr_logs')
        .update({
          word_document_url: wordDocumentUrl,
          ocr_content: ocrText
        })
        .eq('id', ocrLogId);
        
      if (updateError) {
        console.error("Hiba az OCR napló frissítésekor a Word dokumentum URL-jével:", updateError);
      } else {
        console.log("OCR napló sikeresen frissítve a Word dokumentum URL-jével:", updateData);
      }
    }
    
    return wordDocumentUrl;
  } catch (error) {
    console.error("Word dokumentum létrehozási hiba:", error);
    return null;
  }
};
