import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { inquiries, type InquiryRow } from './schema.ts';

export const INQUIRY_STATUSES = ['new', 'contacted', 'booked', 'archived'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export interface CreateInquiryInput {
  name: string;
  email: string;
  contactNumber: string;
  projectType: string;
  message: string;
}

export function isValidInquiryStatus(value: string): value is InquiryStatus {
  return (INQUIRY_STATUSES as readonly string[]).includes(value);
}

export async function createInquiry(input: CreateInquiryInput): Promise<InquiryRow> {
  try {
    const result = await db
      .insert(inquiries)
      .values({
        name: input.name,
        email: input.email,
        contactNumber: input.contactNumber,
        projectType: input.projectType,
        message: input.message,
        status: 'new',
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in createInquiry:', error);
    throw new Error('Could not save your inquiry right now. Please try again shortly.', {
      cause: error,
    });
  }
}

export async function listInquiries(): Promise<InquiryRow[]> {
  try {
    return await db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
  } catch (error) {
    console.error('Database query failed in listInquiries:', error);
    throw new Error('Could not load inquiries right now. Please try again shortly.', {
      cause: error,
    });
  }
}

export async function updateInquiryStatus(
  id: number,
  status: InquiryStatus,
): Promise<InquiryRow | null> {
  try {
    const result = await db
      .update(inquiries)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(inquiries.id, id))
      .returning();

    return result[0] ?? null;
  } catch (error) {
    console.error('Database query failed in updateInquiryStatus:', error);
    throw new Error('Could not update inquiry status. Please try again shortly.', {
      cause: error,
    });
  }
}

export async function deleteInquiry(id: number): Promise<boolean> {
  try {
    const result = await db
      .delete(inquiries)
      .where(eq(inquiries.id, id))
      .returning({ id: inquiries.id });

    return result.length > 0;
  } catch (error) {
    console.error('Database query failed in deleteInquiry:', error);
    throw new Error('Could not delete inquiry. Please try again shortly.', {
      cause: error,
    });
  }
}
