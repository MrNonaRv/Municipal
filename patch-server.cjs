const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf-8');

const chunkLogic = `
const uploadChunks = new Map<string, string[]>();

app.post('/api/employees/chunk', async (req, res) => {
  try {
    const { uploadId, chunkIndex, totalChunks, data } = req.body;
    
    if (!uploadChunks.has(uploadId)) {
      uploadChunks.set(uploadId, new Array(totalChunks));
    }
    
    const chunks = uploadChunks.get(uploadId)!;
    chunks[chunkIndex] = data;
    
    // Check if all chunks are received
    const receivedCount = chunks.filter(c => c !== undefined).length;
    
    if (receivedCount === totalChunks) {
      const fullDataStr = chunks.join('');
      uploadChunks.delete(uploadId);
      
      const employee = JSON.parse(fullDataStr);
      req.body = employee;
      
      // Manually process the employee insertion/update
      const dummyUser = await getDummyUser();
      const existing = await db.select().from(employees).where(eq(employees.originalId, employee.id)).limit(1);
      
      if (existing.length > 0) {
        await db.update(employees).set({
          photo: employee.photo,
          surname: employee.surname,
          firstName: employee.firstName,
          middleName: employee.middleName,
          nameExtension: employee.nameExtension,
          sex: employee.sex,
          civilStatus: employee.civilStatus,
          citizenship: employee.citizenship,
          height: employee.height,
          weight: employee.weight,
          bloodType: employee.bloodType,
          residentialAddress: employee.residentialAddress,
          permanentAddress: employee.permanentAddress,
          zipCode: employee.zipCode,
          telephone: employee.telephone,
          cellphone: employee.cellphone,
          email: employee.email,
          gsisNo: employee.gsisNo,
          pagibigNo: employee.pagibigNo,
          philhealthNo: employee.philhealthNo,
          sssNo: employee.sssNo,
          tin: employee.tin,
          agencyEmployeeNo: employee.agencyEmployeeNo,
          spouseSurname: employee.spouseSurname,
          spouseFirstName: employee.spouseFirstName,
          spouseMiddleName: employee.spouseMiddleName,
          spouseOccupation: employee.spouseOccupation,
          spouseEmployer: employee.spouseEmployer,
          spouseTelephone: employee.spouseTelephone,
          children: employee.children || [],
          fatherSurname: employee.fatherSurname,
          fatherFirstName: employee.fatherFirstName,
          fatherMiddleName: employee.fatherMiddleName,
          motherSurname: employee.motherSurname,
          motherFirstName: employee.motherFirstName,
          motherMiddleName: employee.motherMiddleName,
          education: employee.education || [],
          serviceRecords: employee.serviceRecords || [],
          attachments: employee.attachments || [],
          pdsScan: employee.pdsScan
        }).where(eq(employees.originalId, employee.id));
      } else {
        await db.insert(employees).values({
          userId: dummyUser.id,
          originalId: employee.id,
          photo: employee.photo,
          surname: employee.surname,
          firstName: employee.firstName,
          middleName: employee.middleName,
          nameExtension: employee.nameExtension,
          sex: employee.sex,
          civilStatus: employee.civilStatus,
          citizenship: employee.citizenship,
          height: employee.height,
          weight: employee.weight,
          bloodType: employee.bloodType,
          residentialAddress: employee.residentialAddress,
          permanentAddress: employee.permanentAddress,
          zipCode: employee.zipCode,
          telephone: employee.telephone,
          cellphone: employee.cellphone,
          email: employee.email,
          gsisNo: employee.gsisNo,
          pagibigNo: employee.pagibigNo,
          philhealthNo: employee.philhealthNo,
          sssNo: employee.sssNo,
          tin: employee.tin,
          agencyEmployeeNo: employee.agencyEmployeeNo,
          spouseSurname: employee.spouseSurname,
          spouseFirstName: employee.spouseFirstName,
          spouseMiddleName: employee.spouseMiddleName,
          spouseOccupation: employee.spouseOccupation,
          spouseEmployer: employee.spouseEmployer,
          spouseTelephone: employee.spouseTelephone,
          children: employee.children || [],
          fatherSurname: employee.fatherSurname,
          fatherFirstName: employee.fatherFirstName,
          fatherMiddleName: employee.fatherMiddleName,
          motherSurname: employee.motherSurname,
          motherFirstName: employee.motherFirstName,
          motherMiddleName: employee.motherMiddleName,
          education: employee.education || [],
          serviceRecords: employee.serviceRecords || [],
          attachments: employee.attachments || [],
          pdsScan: employee.pdsScan
        });
      }
      
      await syncDrizzleToFirestore();
      return res.json({ success: true, completed: true });
    } else {
      return res.json({ success: true, completed: false, received: receivedCount });
    }
  } catch (error) {
    console.error('Error in chunked upload:', error);
    res.status(500).json({ error: 'Failed to process chunk' });
  }
});
`;

serverCode = serverCode.replace("app.post('/api/employees', async (req, res) => {", chunkLogic + "\napp.post('/api/employees', async (req, res) => {");

fs.writeFileSync('server.ts', serverCode);
