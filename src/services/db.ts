import { Employee } from '../types/employee';

export const dbGetAll = async (): Promise<Employee[]> => {
  const response = await fetch('/api/employees');
  if (!response.ok) throw new Error('Failed to fetch employees');
  return response.json();
};

export const dbPut = async (emp: Employee): Promise<void> => {
  const response = await fetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emp)
  });
  if (!response.ok) throw new Error('Failed to save employee');
};

export const dbDelete = async (id: string): Promise<void> => {
  const response = await fetch(`/api/employees/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete employee');
};
