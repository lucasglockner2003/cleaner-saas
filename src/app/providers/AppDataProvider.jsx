import { createContext, useEffect, useMemo, useRef, useState } from "react";
import { createSeedDatabase } from "../../mocks/seed";
import { createPersistenceGateway } from "../../persistence/dataSource/createPersistenceGateway";
import { persistWithRetry } from "../../persistence/persistWithRetry";
import { createRepositoryBundle } from "../../persistence/repositories/createRepositoryBundle";
import { appendAuditEvent } from "../../services/audit/auditService";
import { useAuth } from "../../auth/useAuth";

export const AppDataContext = createContext(null);

const repositories = createRepositoryBundle();

export function AppDataProvider({ children }) {
  const { user } = useAuth();
  const [db, setDb] = useState(() => createSeedDatabase());
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [mutationState, setMutationState] = useState({});
  const [syncState, setSyncState] = useState({
    status: "healthy",
    error: null
  });

  const gatewayRef = useRef(createPersistenceGateway());
  const pendingSyncRef = useRef(null);
  const dbRef = useRef(db);

  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  function ensureDatabaseShape(snapshot) {
    const seed = createSeedDatabase();
    if (!snapshot || typeof snapshot !== "object") {
      return seed;
    }

    const merged = {
      ...seed,
      ...snapshot
    };

    Object.keys(seed).forEach((key) => {
      if (!Array.isArray(merged[key])) {
        merged[key] = seed[key];
      }
    });

    return merged;
  }

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const result = await gatewayRef.current.loadState(createSeedDatabase);
      if (!isMounted) {
        return;
      }

      if (result.ok && result.db) {
        setDb(ensureDatabaseShape(result.db));
        setSyncState({
          status: "healthy",
          error: null
        });
      } else {
        setLastFeedback({
          type: "error",
          message: result.error ?? "Failed to bootstrap persisted state. Seed data loaded.",
          at: Date.now()
        });
      }

      setIsBootstrapping(false);
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  function normalizeMutationResult(rawResult, fallbackMessage) {
    if (rawResult && typeof rawResult === "object" && "db" in rawResult) {
      const hasErrors = rawResult.errors && Object.keys(rawResult.errors).length > 0;
      return {
        ...rawResult,
        ok: rawResult.ok ?? !hasErrors,
        message: rawResult.message ?? (hasErrors ? "Validation failed." : fallbackMessage),
        errors: rawResult.errors ?? {}
      };
    }

    return {
      db: rawResult,
      ok: true,
      message: fallbackMessage,
      errors: {},
      persistPlan: null
    };
  }

  function appendMutationAudit(actionKey, payload) {
    const auditResult = appendAuditEvent(payload.db, {
      action_key: actionKey,
      outcome: payload.ok ? "success" : "failure",
      severity: payload.ok ? "info" : "warning",
      actor_id: user?.id ?? "system",
      actor_role: user?.role ?? "system",
      message: payload.message,
      metadata: {
        error_keys: Object.keys(payload.errors ?? {}),
        persistence_mode: gatewayRef.current.mode
      }
    });

    const nextCollections = [
      ...(payload.persistPlan?.collections ?? []),
      "auditEvents"
    ];

    return {
      ...payload,
      db: auditResult.db,
      persistPlan: {
        collections: [...new Set(nextCollections)]
      }
    };
  }

  function runMutation(actionKey, mutator, fallbackMessage = "Saved changes.") {
    let payload = {
      ok: true,
      message: fallbackMessage,
      errors: {}
    };

    setMutationState((current) => ({
      ...current,
      [actionKey]: true
    }));

    setDb((current) => {
      const mutationResult = normalizeMutationResult(mutator(current), fallbackMessage);
      const withAudit = appendMutationAudit(actionKey, mutationResult);
      payload = withAudit;
      dbRef.current = withAudit.db;
      return withAudit.db;
    });

    if (!payload.ok) {
      setMutationState((current) => ({
        ...current,
        [actionKey]: false
      }));
      setLastFeedback({
        type: "error",
        message: payload.message,
        at: Date.now()
      });
      return payload;
    }

    setLastFeedback({
      type: "success",
      message: payload.message,
      at: Date.now()
    });

    Promise.resolve()
      .then(async () => {
        const persistResult = await persistWithRetry(
          gatewayRef.current.saveState.bind(gatewayRef.current),
          payload.db,
          payload.persistPlan,
          1
        );

        if (!persistResult.ok) {
          pendingSyncRef.current = {
            db: payload.db,
            persistPlan: payload.persistPlan
          };
          setSyncState({
            status: "degraded",
            error: persistResult.error
          });
          setLastFeedback({
            type: "error",
            message: `Saved locally but remote sync failed: ${persistResult.error}`,
            at: Date.now()
          });
        } else {
          pendingSyncRef.current = null;
          setSyncState({
            status: "healthy",
            error: null
          });
          if (persistResult.reconciledDb) {
            setDb(ensureDatabaseShape(persistResult.reconciledDb));
          }
        }
      })
      .finally(() => {
        setMutationState((current) => ({
          ...current,
          [actionKey]: false
        }));
      });

    return payload;
  }

  async function runAsyncMutation(actionKey, mutator, fallbackMessage = "Saved changes.") {
    setMutationState((current) => ({
      ...current,
      [actionKey]: true
    }));

    try {
      const currentDb = dbRef.current;
      const rawResult = await mutator(currentDb);
      const payload = appendMutationAudit(actionKey, normalizeMutationResult(rawResult, fallbackMessage));

      if (!payload.ok) {
        setLastFeedback({
          type: "error",
          message: payload.message,
          at: Date.now()
        });
        return payload;
      }

      setDb(payload.db);
      dbRef.current = payload.db;
      setLastFeedback({
        type: "success",
        message: payload.message,
        at: Date.now()
      });

      const persistResult = await persistWithRetry(
        gatewayRef.current.saveState.bind(gatewayRef.current),
        payload.db,
        payload.persistPlan,
        1
      );

      if (!persistResult.ok) {
        pendingSyncRef.current = {
          db: payload.db,
          persistPlan: payload.persistPlan
        };
        setSyncState({
          status: "degraded",
          error: persistResult.error
        });
        setLastFeedback({
          type: "error",
          message: `Saved locally but remote sync failed: ${persistResult.error}`,
          at: Date.now()
        });
      } else {
        pendingSyncRef.current = null;
        setSyncState({
          status: "healthy",
          error: null
        });
        if (persistResult.reconciledDb) {
          setDb(ensureDatabaseShape(persistResult.reconciledDb));
        }
      }

      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mutation failed.";
      const failedResult = {
        db: dbRef.current,
        ok: false,
        message,
        errors: {
          root: message
        }
      };

      setLastFeedback({
        type: "error",
        message,
        at: Date.now()
      });

      return failedResult;
    } finally {
      setMutationState((current) => ({
        ...current,
        [actionKey]: false
      }));
    }
  }

  const actions = useMemo(
    () => ({
      startVisit(visitId) {
        return runMutation("startVisit", (current) => repositories.visits.start(current, visitId), "House visit started.");
      },
      finishVisit(visitId, notes = "") {
        return runMutation(
          "finishVisit",
          (current) => repositories.visits.finish(current, visitId, notes),
          "House visit marked as completed."
        );
      },
      cancelVisit(visitId, reason) {
        return runMutation("cancelVisit", (current) => repositories.visits.cancel(current, visitId, reason), "Visit cancelled.");
      },
      reopenVisit(visitId) {
        return runMutation("reopenVisit", (current) => repositories.visits.reopen(current, visitId), "Visit moved back to scheduled.");
      },
      updateVisitNotes(visitId, notes) {
        return runMutation("updateVisitNotes", (current) => repositories.visits.updateNotes(current, visitId, notes), "Visit notes updated.");
      },
      addVisitPhoto(visitId, phase, fileName) {
        return runMutation(
          "addVisitPhoto",
          (current) => repositories.visits.addPhoto(current, visitId, phase, fileName),
          "Proof photo metadata added."
        );
      },
      moveVisit(visitId, direction) {
        return runMutation("moveVisit", (current) => repositories.schedule.moveVisit(current, visitId, direction), "Visit order updated.");
      },
      assignVisitTeam(visitId, teamId) {
        return runMutation("assignVisitTeam", (current) => repositories.schedule.assignVisitTeam(current, visitId, teamId), "Visit reassigned to team.");
      },
      assignVisitEmployee(visitId, employeeId) {
        return runMutation("assignVisitEmployee", (current) => repositories.schedule.assignVisitEmployee(current, visitId, employeeId), "Visit cleaner assignment updated.");
      },
      applySuggestedRouteOrder(scheduleDayId) {
        return runMutation(
          "applySuggestedRouteOrder",
          (current) => repositories.schedule.applySuggestedOrder(current, scheduleDayId),
          "Recommended route order applied."
        );
      },
      createClient(payload) {
        return runMutation("createClient", (current) => repositories.clients.create(current, payload), "Client registered.");
      },
      updateClient(clientId, payload) {
        return runMutation("updateClient", (current) => repositories.clients.update(current, clientId, payload), "Client updated.");
      },
      setClientStatus(clientId, status) {
        return runMutation("setClientStatus", (current) => repositories.clients.setStatus(current, clientId, status), `Client marked as ${status}.`);
      },
      deleteClient(clientId) {
        return runMutation("deleteClient", (current) => repositories.clients.remove(current, clientId), "Client archived/deleted.");
      },
      addClientNote(clientId, payload) {
        return runMutation("addClientNote", (current) => repositories.clients.addNote(current, clientId, payload), "Client note added.");
      },
      setClientNoteActive(noteId, isActive) {
        return runMutation("setClientNoteActive", (current) => repositories.clients.setNoteActive(current, noteId, isActive), isActive ? "Note restored." : "Note archived.");
      },
      adjustStock(productId, payload) {
        return runMutation("adjustStock", (current) => repositories.products.adjustStock(current, productId, payload), "Inventory updated.");
      },
      reassignEmployee(employeeId, teamId) {
        return runMutation("reassignEmployee", (current) => repositories.teams.reassignEmployee(current, employeeId, teamId), "Employee assignment updated.");
      },
      prepareRemindersForDate(targetDate, scheduledAt = null) {
        return runMutation(
          "prepareRemindersForDate",
          (current) => repositories.reminders.prepareForDate(current, targetDate, scheduledAt),
          "Reminder queue prepared."
        );
      },
      runReminderDispatchCycle(options = {}) {
        return runMutation(
          "runReminderDispatchCycle",
          (current) => repositories.reminders.dispatchCycle(current, options),
          "Reminder dispatch cycle completed."
        );
      },
      retryReminder(reminderId) {
        return runMutation(
          "retryReminder",
          (current) => repositories.reminders.retryNow(current, reminderId),
          "Reminder retry scheduled."
        );
      },
      generateInvoiceDrafts(periodStart, periodEnd) {
        return runMutation(
          "generateInvoiceDrafts",
          (current) => repositories.invoices.generateDrafts(current, periodStart, periodEnd),
          "Invoice draft generation completed."
        );
      },
      setInvoiceStatus(invoiceId, nextStatus) {
        return runMutation(
          "setInvoiceStatus",
          (current) => repositories.invoices.setStatus(current, invoiceId, nextStatus),
          `Invoice status updated to ${nextStatus}.`
        );
      },
      queueInvoiceEmail(invoiceId) {
        return runMutation(
          "queueInvoiceEmail",
          (current) => repositories.invoices.queueEmail(current, invoiceId),
          "Invoice email queued."
        );
      },
      runInvoiceDispatchCycle(options = {}) {
        return runMutation(
          "runInvoiceDispatchCycle",
          (current) => repositories.invoices.dispatchEmailCycle(current, options),
          "Invoice email dispatch cycle completed."
        );
      },
      retryInvoiceEmailJob(jobId) {
        return runMutation(
          "retryInvoiceEmailJob",
          (current) => repositories.invoices.retryEmailJob(current, jobId),
          "Invoice email retry scheduled."
        );
      },
      createPayment(payload) {
        return runMutation(
          "createPayment",
          (current) => repositories.payments.create(current, payload),
          "Payment record saved."
        );
      },
      preparePaymentIntent(payload) {
        return runAsyncMutation(
          "preparePaymentIntent",
          (current) => repositories.payments.prepareIntent(current, payload),
          "Payment intent prepared."
        );
      },
      setPaymentStatus(paymentId, status, options = {}) {
        return runMutation(
          "setPaymentStatus",
          (current) => repositories.payments.setStatus(current, paymentId, status, options),
          `Payment marked as ${status}.`
        );
      },
      applyPaymentProviderEvent(payload) {
        return runMutation(
          "applyPaymentProviderEvent",
          (current) => repositories.payments.applyProviderEvent(current, payload),
          "Payment provider event processed."
        );
      },
      runPaymentReconciliationCycle(options = {}) {
        return runAsyncMutation(
          "runPaymentReconciliationCycle",
          (current) => repositories.payments.reconcile(current, options),
          "Payment reconciliation cycle completed."
        );
      },
      createSubscriptionPlan(payload) {
        return runMutation(
          "createSubscriptionPlan",
          (current) => repositories.subscriptions.createPlan(current, payload),
          "Subscription plan created."
        );
      },
      assignClientSubscription(payload) {
        return runMutation(
          "assignClientSubscription",
          (current) => repositories.subscriptions.assignClient(current, payload),
          "Client subscription assigned."
        );
      },
      setClientSubscriptionStatus(subscriptionId, status) {
        return runMutation(
          "setClientSubscriptionStatus",
          (current) => repositories.subscriptions.setClientStatus(current, subscriptionId, status),
          `Subscription marked as ${status}.`
        );
      },
      updateClientLifecycle(clientId, payload) {
        return runMutation(
          "updateClientLifecycle",
          (current) => repositories.crm.updateProfile(current, clientId, payload),
          "CRM lifecycle profile updated."
        );
      },
      refreshLifecycleSignals(options = {}) {
        return runMutation(
          "refreshLifecycleSignals",
          (current) => repositories.crm.refreshSignals(current, options),
          "Lifecycle signals refreshed."
        );
      },
      createReferral(payload) {
        return runMutation(
          "createReferral",
          (current) => repositories.growth.createReferral(current, payload),
          "Referral record created."
        );
      },
      setReferralStatus(referralId, status, options = {}) {
        return runMutation(
          "setReferralStatus",
          (current) => repositories.growth.setReferralStatus(current, referralId, status, options),
          `Referral marked as ${status}.`
        );
      },
      createGrowthCampaign(payload) {
        return runMutation(
          "createGrowthCampaign",
          (current) => repositories.growth.createCampaign(current, payload),
          "Growth campaign created."
        );
      },
      setGrowthCampaignStatus(campaignId, status) {
        return runMutation(
          "setGrowthCampaignStatus",
          (current) => repositories.growth.setCampaignStatus(current, campaignId, status),
          `Campaign marked as ${status}.`
        );
      },
      queueOperationJob(payload) {
        return runMutation(
          "queueOperationJob",
          (current) => repositories.operations.queue(current, payload),
          "Operation job queued."
        );
      },
      runOperationJobCycle(options = {}) {
        return runAsyncMutation(
          "runOperationJobCycle",
          (current) => repositories.operations.runCycle(current, options),
          "Operation job executor cycle completed."
        );
      },
      retryOperationJob(jobId) {
        return runMutation(
          "retryOperationJob",
          (current) => repositories.operations.retry(current, jobId),
          "Operation job retry scheduled."
        );
      },
      queueCompletionEmail(visitId, options = {}) {
        return runMutation(
          "queueCompletionEmail",
          (current) => repositories.completion.queueForVisit(current, visitId, options),
          "Completion email queued."
        );
      },
      runCompletionDispatchCycle(options = {}) {
        return runMutation(
          "runCompletionDispatchCycle",
          (current) => repositories.completion.dispatchCycle(current, options),
          "Completion email dispatch cycle completed."
        );
      },
      retryCompletionJob(jobId) {
        return runMutation(
          "retryCompletionJob",
          (current) => repositories.completion.retryJob(current, jobId),
          "Completion communication retry scheduled."
        );
      },
      createBookingRequest(payload, options = {}) {
        return runMutation(
          "createBookingRequest",
          (current) => repositories.bookings.createRequest(current, payload, options),
          "Booking request submitted."
        );
      },
      updateBookingRequestStatus(bookingId, status, reviewerId = null, internalNotes = "") {
        return runMutation(
          "updateBookingRequestStatus",
          (current) => repositories.bookings.setStatus(current, bookingId, status, reviewerId, internalNotes),
          `Booking marked as ${status}.`
        );
      },
      createRecurringService(payload) {
        return runMutation(
          "createRecurringService",
          (current) => repositories.recurring.create(current, payload),
          "Recurring service created."
        );
      },
      updateRecurringService(recurringId, payload) {
        return runMutation(
          "updateRecurringService",
          (current) => repositories.recurring.update(current, recurringId, payload),
          "Recurring service updated."
        );
      },
      setRecurringServiceStatus(recurringId, status) {
        return runMutation(
          "setRecurringServiceStatus",
          (current) => repositories.recurring.setStatus(current, recurringId, status),
          `Recurring service marked as ${status}.`
        );
      },
      materializeRecurringOccurrence(recurringId, occurrenceDate, options = {}) {
        return runMutation(
          "materializeRecurringOccurrence",
          (current) => repositories.recurring.materialize(current, recurringId, occurrenceDate, options),
          "Recurring occurrence added to schedule."
        );
      },
      getPilotCsvTemplate() {
        return repositories.pilot.getClientCsvTemplate();
      },
      getPilotCsvSample() {
        return repositories.pilot.getClientCsvSample();
      },
      importPilotClientsCsv(csvText) {
        return runMutation(
          "importPilotClientsCsv",
          (current) => repositories.pilot.importClientsCsv(current, csvText),
          "Client CSV import completed."
        );
      },
      generatePilotWeekSchedule(options = {}) {
        return runMutation(
          "generatePilotWeekSchedule",
          (current) => repositories.pilot.generateWeekSchedule(current, options),
          "Pilot week schedule generated."
        );
      },
      generatePilotFakeVisits(options = {}) {
        return runMutation(
          "generatePilotFakeVisits",
          (current) => repositories.pilot.generateFakeVisits(current, options),
          "Synthetic visit execution run completed."
        );
      },
      generatePilotTestInvoices(options = {}) {
        return runMutation(
          "generatePilotTestInvoices",
          (current) => repositories.pilot.generateInvoices(current, options),
          "Test invoice generation completed."
        );
      },
      simulatePilotPayments(options = {}) {
        return runMutation(
          "simulatePilotPayments",
          (current) => repositories.pilot.simulatePayments(current, options),
          "Test payment simulation completed."
        );
      },
      async retryPendingSync() {
        if (!pendingSyncRef.current) {
          return {
            ok: true,
            message: "No pending sync."
          };
        }

        const result = await persistWithRetry(
          gatewayRef.current.saveState.bind(gatewayRef.current),
          pendingSyncRef.current.db,
          pendingSyncRef.current.persistPlan,
          2
        );

        if (result.ok) {
          pendingSyncRef.current = null;
          setSyncState({
            status: "healthy",
            error: null
          });
          setLastFeedback({
            type: "success",
            message: "Pending sync completed.",
            at: Date.now()
          });

          return {
            ok: true
          };
        }

        setSyncState({
          status: "degraded",
          error: result.error
        });

        setLastFeedback({
          type: "error",
          message: `Retry failed: ${result.error}`,
          at: Date.now()
        });

        return {
          ok: false,
          error: result.error
        };
      },
      clearFeedback() {
        setLastFeedback(null);
      },
      reset() {
        const fresh = createSeedDatabase();
        setDb(fresh);
        gatewayRef.current.saveState(fresh);
        setSyncState({
          status: "healthy",
          error: null
        });
        setLastFeedback({
          type: "success",
          message: "Dataset reset to seed state.",
          at: Date.now()
        });
      }
    }),
    [user]
  );

  const value = useMemo(
    () => ({
      db,
      actions,
      lastFeedback,
      mutationState,
      isBootstrapping,
      persistence: {
        mode: gatewayRef.current.mode,
        requestedProvider: gatewayRef.current.requestedProvider,
        syncState
      }
    }),
    [actions, db, isBootstrapping, lastFeedback, mutationState, syncState]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
