import { z } from 'zod';
import { HttpError } from './errors.js';

export const collegeSelectionFields = {
  collegeId: z.string().uuid('Select an active college.').optional(),
  department: z.string().min(1, 'Select an active college.').max(120).optional()
};

function invalidCollege() {
  return new HttpError(400, 'INVALID_COLLEGE', 'Select an active college from the list.');
}

export async function resolveCollegeSelection(prisma, input, {
  existingCollegeId = null,
  existingDepartment = null
} = {}) {
  if (!input.collegeId && !input.department) throw invalidCollege();

  if (!input.collegeId && existingCollegeId && input.department === existingDepartment) {
    const existing = await prisma.college.findUnique({ where: { id: existingCollegeId } });
    if (existing) return existing;
  }

  const byId = input.collegeId
    ? await prisma.college.findUnique({ where: { id: input.collegeId } })
    : null;
  if (input.collegeId && !byId) throw invalidCollege();

  let byDepartment = null;
  if (input.department) {
    byDepartment = await prisma.college.findUnique({ where: { name: input.department } });
    if (byDepartment?.name !== input.department) byDepartment = null;
    if (!byDepartment) {
      const unchangedLegacyValue = byId
        && byId.id === existingCollegeId
        && input.department === existingDepartment;
      if (!unchangedLegacyValue) throw invalidCollege();
    }
  }

  if (byId && byDepartment && byId.id !== byDepartment.id) throw invalidCollege();
  const college = byId || byDepartment;
  if (!college) throw invalidCollege();
  if (!college.isActive && college.id !== existingCollegeId) throw invalidCollege();

  return college;
}

export function departmentValue(user) {
  if (user.department) return user.department;
  if (user.role === 'ADMIN') return user.organizationUnit || '';
  return user.college?.name || '';
}

export function collegeAssignmentFields(user) {
  return {
    collegeId: user.collegeId || null,
    collegeName: user.college?.name || null,
    collegeCode: user.college?.code || null,
    collegeIsActive: user.college ? user.college.isActive : null
  };
}
