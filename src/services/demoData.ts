import { Employee } from '../types/employee';

export const DEMO_EMPLOYEES: Employee[] = [
  {
    id: "EMP-001",
    photo: null,
    surname: "ANDAYA",
    firstName: "MA. AURORA",
    middleName: "PADIOS",
    nameExtension: "",
    dateOfBirth: "1968-08-15",
    placeOfBirth: "Mambusao, Capiz",
    sex: "Female",
    civilStatus: "Married",
    citizenship: "Filipino",
    height: "1.55 m",
    weight: "65 kg",
    bloodType: "O+",
    residentialAddress: "Poblacion Tabuc, Mambusao, Capiz",
    permanentAddress: "Poblacion Tabuc, Mambusao, Capiz",
    zipCode: "5807",
    telephone: "",
    cellphone: "09171234567",
    email: "aurora.andaya@example.gov.ph",
    gsisNo: "2001234567",
    pagibigNo: "121012345678",
    philhealthNo: "14-012345678-9",
    sssNo: "07-1234567-8",
    tin: "123-456-789-000",
    agencyEmployeeNo: "1991-001",
    spouseSurname: "ANDAYA",
    spouseFirstName: "ROBERTO",
    spouseMiddleName: "V.",
    spouseOccupation: "Businessman",
    spouseEmployer: "Self-Employed",
    spouseTelephone: "",
    children: [
      { name: "Robert Paul Andaya", dob: "1995-05-10" },
      { name: "Maria Clara Andaya", dob: "1998-11-22" }
    ],
    fatherSurname: "PADIOS",
    fatherFirstName: "JUAN",
    fatherMiddleName: "D.",
    motherSurname: "PADIOS",
    motherFirstName: "TERESA",
    motherMiddleName: "M.",
    education: [
      { id: "edu-1", level: "College", school: "Capiz State University", course: "BS Commerce", yearGraduated: "1989", from: "1985", to: "1989", honors: "" }
    ],
    serviceRecords: [
      { id: "sr-1", from: "1991-07-01", to: "1995-12-31", designation: "Bookkeeper", status: "Perm.", salary: "P120,000/a", station: "Mambusao", branch: "Local", lwop: "", sepDate: "", sepCause: "" },
      { id: "sr-2", from: "1996-01-01", to: "2005-06-30", designation: "Admin Officer I", status: "Perm.", salary: "P180,000/a", station: "Mambusao", branch: "Local", lwop: "", sepDate: "", sepCause: "" },
      { id: "sr-3", from: "2005-07-01", to: "Present", designation: "Municipal Civil Registrar I", status: "Perm.", salary: "P477,600/a", station: "Mambusao", branch: "Local", lwop: "", sepDate: "", sepCause: "" }
    ]
  }
];
