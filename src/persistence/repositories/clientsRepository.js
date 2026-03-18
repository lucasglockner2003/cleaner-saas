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
      return withPersistPlan(createClientRecord(db, payload), ["clients"]);
    },

    update(db, clientId, payload) {
      return withPersistPlan(updateClientRecord(db, clientId, payload), ["clients"]);
    },

    setStatus(db, clientId, status) {
      return withPersistPlan(setClientStatus(db, clientId, status), ["clients"]);
    },

    remove(db, clientId) {
      return withPersistPlan(deleteClientRecord(db, clientId), ["clients", "clientNotes", "recurringServices", "reminders"]);
    },

    addNote(db, clientId, payload) {
      return withPersistPlan(addClientNoteRecord(db, clientId, payload), ["clientNotes"]);
    },

    setNoteActive(db, noteId, isActive) {
      return withPersistPlan(setClientNoteActiveState(db, noteId, isActive), ["clientNotes"]);
    }
  };
}

