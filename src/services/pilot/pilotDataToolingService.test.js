import { describe, expect, it } from "vitest";
import { createSeedDatabase } from "../../mocks/seed";
import {
  generateFakeVisitExecutions,
  generatePilotWeekSchedule,
  generateTestInvoices,
  importClientsFromCsv,
  simulateTestPayments
} from "./pilotDataToolingService";

describe("pilotDataToolingService", () => {
  it("imports clients from CSV and applies inactive status when provided", () => {
    const db = createSeedDatabase();
    const csv = [
      "full_name,phone,email,suburb,address,service_type,cleaning_frequency,estimated_duration_min,status",
      "\"Pilot Import Client\",\"+64 21 999 1111\",\"pilot.import@example.com\",\"Epsom\",\"25 Pilot Road, Epsom, Auckland\",\"Regular Clean\",\"Weekly\",95,\"inactive\"",
      "\"Pilot Import Fallback\",\"+64 21 999 2222\",\"pilot.fallback@example.com\",\"Epsom\",\"28 Pilot Road, Epsom, Auckland\",\"Regular Clean\",\"Weekly\",,\"active\""
    ].join("\n");

    const result = importClientsFromCsv(db, csv);

    expect(result.ok).toBe(true);
    expect(result.summary.imported).toBe(2);
    const importedClient = result.db.clients.find((client) => client.full_name === "Pilot Import Client");
    expect(importedClient).toBeTruthy();
    expect(importedClient.status).toBe("inactive");
    const fallbackClient = result.db.clients.find((client) => client.full_name === "Pilot Import Fallback");
    expect(fallbackClient).toBeTruthy();
    expect(fallbackClient.estimated_duration_min).toBeGreaterThan(0);
  });

  it("generates a weekly schedule and fake visit execution outcomes", () => {
    const db = createSeedDatabase();
    const scheduleResult = generatePilotWeekSchedule(db, {
      weekStartDate: "2026-03-23",
      maxClients: 12,
      clearExistingWeek: true
    });

    expect(scheduleResult.ok).toBe(true);
    expect(scheduleResult.summary.createdVisits).toBeGreaterThan(0);

    const fakeResult = generateFakeVisitExecutions(scheduleResult.db, {
      fromDate: "2026-03-23",
      toDate: "2026-03-27",
      maxVisits: 8,
      addProof: true
    });

    expect(fakeResult.ok).toBe(true);
    expect(fakeResult.summary.processed).toBeGreaterThan(0);
    expect(fakeResult.summary.completed + fakeResult.summary.inProgress + fakeResult.summary.cancelled).toBeGreaterThan(0);
  });

  it("generates test invoices and simulates captured payments", () => {
    const db = createSeedDatabase();
    const invoiceResult = generateTestInvoices(db, {
      month: "2026-03",
      issueDrafts: true,
      queueEmail: true,
      maxIssue: 10
    });

    expect(invoiceResult.ok).toBe(true);
    expect(invoiceResult.summary.createdDrafts + invoiceResult.summary.updatedDrafts).toBeGreaterThan(0);

    const paymentResult = simulateTestPayments(invoiceResult.db, {
      mode: "captured",
      provider: "manual",
      methodType: "bank_transfer",
      amountMode: "full",
      maxInvoices: 5
    });

    expect(paymentResult.ok).toBe(true);
    expect(paymentResult.summary.created).toBeGreaterThan(0);
    expect(paymentResult.summary.captured).toBe(paymentResult.summary.created);
  });
});
