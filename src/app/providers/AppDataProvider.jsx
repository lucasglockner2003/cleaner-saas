import { createContext, useMemo, useState } from "react";
import { createSeedDatabase } from "../../mocks/seed";
import { startVisitExecution, finishVisitExecution } from "../../services/visits/visitsService";
import { createClientRecord } from "../../services/clients/clientsService";

export const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [db, setDb] = useState(() => createSeedDatabase());

  const actions = useMemo(
    () => ({
      startVisit(visitId) {
        setDb((current) => startVisitExecution(current, visitId));
      },
      finishVisit(visitId, notes = "") {
        setDb((current) => finishVisitExecution(current, visitId, notes));
      },
      createClient(payload) {
        setDb((current) => createClientRecord(current, payload));
      },
      reset() {
        setDb(createSeedDatabase());
      }
    }),
    []
  );

  const value = useMemo(
    () => ({
      db,
      actions
    }),
    [actions, db]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
