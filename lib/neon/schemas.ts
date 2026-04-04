import { z } from "zod";

const metricValueSchema = z.object({
  metric_name: z.string(),
  value: z.number(),
});

const timeframeV2Schema = z
  .object({
    timeframe_start: z.string(),
    timeframe_end: z.string(),
    metrics: z.array(metricValueSchema).default([]),
  })
  .passthrough();

const periodV2Schema = z
  .object({
    period_id: z.string().uuid().optional(),
    period_plan: z.string().optional(),
    period_start: z.string().optional(),
    period_end: z.string().nullable().optional(),
    consumption: z.array(timeframeV2Schema).default([]),
  })
  .passthrough();

const projectConsumptionV2Schema = z
  .object({
    project_id: z.string(),
    periods: z.array(periodV2Schema).default([]),
  })
  .passthrough();

const paginationSchema = z
  .object({
    cursor: z.string().min(1),
  })
  .optional();

export const consumptionHistoryV2ResponseSchema = z
  .object({
    projects: z.array(projectConsumptionV2Schema),
    pagination: paginationSchema,
  })
  .passthrough();

export type ConsumptionHistoryV2Response = z.infer<
  typeof consumptionHistoryV2ResponseSchema
>;

const projectListItemSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    region_id: z.string().optional(),
  })
  .passthrough();

export const listProjectsResponseSchema = z
  .object({
    projects: z.array(projectListItemSchema),
    pagination: paginationSchema,
  })
  .passthrough();

export type ListProjectsResponse = z.infer<typeof listProjectsResponseSchema>;
