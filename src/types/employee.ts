export interface Child {
  name: string;
  dob: string;
}

export interface Education {
  id: string;
  level: string;
  school: string;
  course: string;
  yearGraduated: string;
  from: string;
  to: string;
  honors: string;
}

export interface ServiceRecord {
  id: string;
  from: string;
  to: string;
  designation: string;
  status: string;
  salary: string;
  station: string;
  branch: string;
  lwop: string;
  sepDate: string;
  sepCause: string;
}

export interface Attachment {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileData: string; // Base64 Data URI (optional or fallback when not on drive)
  uploadedAt: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  driveWebContentLink?: string;
}

export interface Employee {
  id: string;
  photo: string | null;
  
  // Personal
  surname: string;
  firstName: string;
  middleName: string;
  nameExtension: string;
  dateOfBirth: string;
  placeOfBirth: string;
  sex: string;
  civilStatus: string;
  citizenship: string;
  height: string;
  weight: string;
  bloodType: string;
  residentialAddress: string;
  permanentAddress: string;
  zipCode: string;
  telephone: string;
  cellphone: string;
  email: string;
  
  // Gov IDs
  gsisNo: string;
  pagibigNo: string;
  philhealthNo: string;
  sssNo: string;
  tin: string;
  agencyEmployeeNo: string;
  
  // Family
  spouseSurname: string;
  spouseFirstName: string;
  spouseMiddleName: string;
  spouseOccupation: string;
  spouseEmployer: string;
  spouseTelephone: string;
  children: Child[];
  fatherSurname: string;
  fatherFirstName: string;
  fatherMiddleName: string;
  motherSurname: string;
  motherFirstName: string;
  motherMiddleName: string;
  
  // Education & Service
  education: Education[];
  serviceRecords: ServiceRecord[];
  attachments?: Attachment[];
  pdsScan?: string | null;
}

