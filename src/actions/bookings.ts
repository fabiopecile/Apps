"use server";

import { revalidatePath } from "next/cache";
import * as dal from "@/data/bookings";
import type { BookingInput, SeriesInput } from "@/lib/validation";

function revalidateAll() {
  revalidatePath("/kalender");
  revalidatePath("/dashboard");
  revalidatePath("/konflikte");
  revalidatePath("/drucken");
}

export async function checkConflictAction(input: Parameters<typeof dal.checkConflict>[0]) {
  return dal.checkConflict(input);
}

export async function getBookingAction(id: string) {
  return dal.getBooking(id);
}

export async function listActivityForBookingAction(bookingId: string) {
  return dal.listActivityForBooking(bookingId);
}

export async function createBookingAction(input: BookingInput) {
  const result = await dal.createBooking(input);
  if (result.success) revalidateAll();
  return result;
}

export async function updateBookingAction(id: string, input: BookingInput) {
  const result = await dal.updateBooking(id, input);
  if (result.success) revalidateAll();
  return result;
}

export async function deleteBookingAction(id: string) {
  const result = await dal.deleteBooking(id);
  if (result.success) revalidateAll();
  return result;
}

export async function moveBookingFieldAction(id: string, newFieldId: string) {
  const result = await dal.moveBookingField(id, newFieldId);
  if (result.success) revalidateAll();
  return result;
}

export async function copyBookingAction(id: string, newDate: string) {
  const result = await dal.copyBooking(id, newDate);
  if (result.success) revalidateAll();
  return result;
}

export async function duplicateDayAction(fromDate: string, toDate: string) {
  const result = await dal.duplicateDay(fromDate, toDate);
  if (result.success) revalidateAll();
  return result;
}

export async function previewSeriesAction(input: SeriesInput) {
  return dal.previewSeries(input);
}

export async function createSeriesAction(input: SeriesInput) {
  const result = await dal.createSeries(input);
  if (result.success) revalidateAll();
  return result;
}
