export const genId = () => 'EMP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 9).toUpperCase();

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
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
            resolve(canvas.toDataURL('image/jpeg', 0.4));
          } else {
            resolve(result);
          }
        };
        img.onerror = () => resolve(result);
        img.src = result;
      } else {
        resolve(result);
      }
    };
    reader.onerror = error => reject(error);
  });
};

export const generateEmptyEmployee = (): import('../types/employee').Employee => ({
  id: genId(),
  photo: null,
  surname: '', firstName: '', middleName: '', nameExtension: '',
  sex: '', civilStatus: '', citizenship: '',
  height: '', weight: '', bloodType: '',
  residentialAddress: '', permanentAddress: '', zipCode: '',
  telephone: '', cellphone: '', email: '',
  gsisNo: '', pagibigNo: '', philhealthNo: '', sssNo: '', tin: '', agencyEmployeeNo: '',
  spouseSurname: '', spouseFirstName: '', spouseMiddleName: '', spouseOccupation: '', spouseEmployer: '', spouseTelephone: '',
  children: [],
  fatherSurname: '', fatherFirstName: '', fatherMiddleName: '',
  motherSurname: '', motherFirstName: '', motherMiddleName: '',
  education: [],
  serviceRecords: [],
  pdsScan: null
});


export const dataURLtoBlob = (dataurl: string): Blob => {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};
