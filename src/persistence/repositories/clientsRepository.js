import {
  addClientNoteRecord,
  createClientRecord,
  deleteClientRecord,
  setClientNoteActiveState,
  setClientStatus,
  updateClientRecord
} from "../../services/clients/clientsService";
import { withPersistPlan } from "./repositoryResult";

export function createClientsRepository() {
  return {
    create(db, payload) {
      return withPersistPlan(createClientRecord(db, payload), ["clients", "crmProfiles"]);
    },

    update(db, clientId, payload) {
      return withPersistPlan(updateClientRecord(db, clientId, payload), ["clients", "crmProfiles"]);
    },

    setStatus(db, clientId, status) {
      return withPersistPlan(setClientStatus(db, clientId, status), ["clients"]);
    },

    remove(db, clientId) {
      return withPersistPlan(deleteClientRecord(db, clientId), [
        "clients",
        "clientNotes",
        "recurringServices",
        "reminders",
        "crmProfiles",
        "clientSubscriptions",
        "payments",
        "paymentEvents",
        "referrals",
        "portalAccounts"
      ]);
    },

    addNote(db, clientId, payload) {
      return withPersistPlan(addClientNoteRecord(db, clientId, payload), ["clientNotes"]);
    },

    setNoteActive(db, noteId, isActive) {
      return withPersistPlan(setClientNoteActiveState(db, noteId, isActive), ["clientNotes"]);
    }
  };
}
