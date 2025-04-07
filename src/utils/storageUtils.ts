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
            text += content.items.map(item => item.str).join(" ") + "\n";
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
