export const genId = () => 'EMP-' + Date.now().toString(36).toUpperCase();

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const generateEmptyEmployee = (): import('../types/employee').Employee => ({
  id: genId(),
  photo: null,
  surname: '', firstName: '', middleName: '', nameExtension: '',
  dateOfBirth: '', placeOfBirth: '', sex: '', civilStatus: '', citizenship: '',
  height: '', weight: '', bloodType: '',
  residentialAddress: '', permanentAddress: '', zipCode: '',
  telephone: '', cellphone: '', email: '',
  gsisNo: '', pagibigNo: '', philhealthNo: '', sssNo: '', tin: '', agencyEmployeeNo: '',
  spouseSurname: '', spouseFirstName: '', spouseMiddleName: '', spouseOccupation: '', spouseEmployer: '', spouseTelephone: '',
  children: [],
  fatherSurname: '', fatherFirstName: '', fatherMiddleName: '',
  motherSurname: '', motherFirstName: '', motherMiddleName: '',
  education: [],
  serviceRecords: []
});
