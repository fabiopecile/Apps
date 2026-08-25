import { z } from "zod";

const dateKeyRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const BookingInputSchema = z
  .object({
    date: z.string().regex(dateKeyRegex, "Bitte ein gültiges Datum wählen."),
    fieldId: z.string().min(1, "Bitte ein Feld wählen."),
    teamId: z.string().min(1, "Bitte eine Mannschaft wählen."),
    startTime: z.string().regex(timeRegex, "Bitte eine gültige Uhrzeit angeben."),
    endTime: z.string().regex(timeRegex, "Bitte eine gültige Uhrzeit angeben."),
    note: z.string().max(500, "Bemerkung darf maximal 500 Zeichen lang sein.").optional().nullable(),
    allowMultiple: z.boolean().optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Das Ende muss nach dem Beginn liegen.",
    path: ["endTime"],
  });

export type BookingInput = z.infer<typeof BookingInputSchema>;

export const SeriesInputSchema = z
  .object({
    teamId: z.string().min(1, "Bitte eine Mannschaft wählen."),
    fieldId: z.string().min(1, "Bitte ein Feld wählen."),
    weekday: z.number().int().min(0).max(6),
    startTime: z.string().regex(timeRegex, "Bitte eine gültige Uhrzeit angeben."),
    endTime: z.string().regex(timeRegex, "Bitte eine gültige Uhrzeit angeben."),
    startDate: z.string().regex(dateKeyRegex, "Bitte ein gültiges Startdatum wählen."),
    endDate: z.string().regex(dateKeyRegex, "Bitte ein gültiges Enddatum wählen."),
    note: z.string().max(500).optional().nullable(),
    allowMultiple: z.boolean().optional(),
  })
  .refine((data) => data.startTime < data.endTime, { message: "Das Ende muss nach dem Beginn liegen.", path: ["endTime"] })
  .refine((data) => data.startDate <= data.endDate, { message: "Das Enddatum muss nach dem Startdatum liegen.", path: ["endDate"] });

export type SeriesInput = z.infer<typeof SeriesInputSchema>;

export const TeamInputSchema = z.object({
  name: z.string().trim().min(1, "Bitte einen Namen angeben.").max(60),
  ageGroup: z.string().trim().max(40).optional().nullable(),
  trainer: z.string().trim().max(80).optional().nullable(),
  trainingGroup: z.string().trim().max(80).optional().nullable(),
  color: z.string().regex(hexColorRegex, "Bitte eine gültige Farbe wählen."),
});
export type TeamInput = z.infer<typeof TeamInputSchema>;

export const LocationInputSchema = z.object({
  name: z.string().trim().min(1, "Bitte einen Namen angeben.").max(60),
  group: z.string().trim().min(1, "Bitte eine Gruppe angeben.").max(60),
});
export type LocationInput = z.infer<typeof LocationInputSchema>;

export const FieldInputSchema = z.object({
  locationId: z.string().min(1),
  name: z.string().trim().min(1, "Bitte einen Namen angeben.").max(60),
  allowMultiple: z.boolean(),
});
export type FieldInput = z.infer<typeof FieldInputSchema>;

export const UserCreateSchema = z.object({
  name: z.string().trim().min(1, "Bitte einen Namen angeben.").max(80),
  email: z.string().trim().toLowerCase().email("Bitte eine gültige E-Mail-Adresse angeben."),
  password: z.string().min(6, "Das Passwort muss mindestens 6 Zeichen lang sein."),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});
export type UserCreateInput = z.infer<typeof UserCreateSchema>;

export const UserUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
  password: z.union([z.string().min(6, "Das Passwort muss mindestens 6 Zeichen lang sein."), z.literal("")]).optional(),
});
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;
