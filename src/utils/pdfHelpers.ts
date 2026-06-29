import { jsPDF } from 'jspdf';

export const convertImageToPDF = async (imageFile: File, newFileName: string): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const img = new Image();
        img.onload = function() {
          try {
            let w = img.width;
            let h = img.height;
            const MAX_DIM = 600;
            
            if (w > MAX_DIM || h > MAX_DIM) {
              if (w > h) {
                h = Math.round(h * (MAX_DIM / w));
                w = MAX_DIM;
              } else {
                w = Math.round(w * (MAX_DIM / h));
                h = MAX_DIM;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.4);
              
              const pdf = new jsPDF({
                orientation: w > h ? 'landscape' : 'portrait',
                unit: 'px',
                format: [w, h]
              });
              
              pdf.addImage(compressedDataUrl, 'JPEG', 0, 0, w, h, undefined, 'FAST');
              
              const pdfBlob = pdf.output('blob');
              const pdfFile = new File([pdfBlob], newFileName.replace(/\.[^/.]+$/, "") + ".pdf", { type: 'application/pdf' });
              resolve(pdfFile);
            } else {
              reject(new Error("Canvas context not available"));
            }
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
};
