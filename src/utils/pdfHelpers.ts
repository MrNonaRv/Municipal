import { jsPDF } from 'jspdf';

export const convertImageToPDF = async (imageFile: File, newFileName: string): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const img = new Image();
        img.onload = function() {
          try {
            const pdf = new jsPDF({
              orientation: img.width > img.height ? 'landscape' : 'portrait',
              unit: 'px',
              format: [img.width, img.height]
            });
            
            pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
            
            const pdfBlob = pdf.output('blob');
            const pdfFile = new File([pdfBlob], newFileName.replace(/\.[^/.]+$/, "") + ".pdf", { type: 'application/pdf' });
            resolve(pdfFile);
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
