import { useMemo } from "react";
import { useAppData } from "../../hooks/useAppData";
import { useAuth } from "../../auth/useAuth";
import { customerPortalService } from "../../services";

export function usePortalSnapshot() {
  const { db } = useAppData();
  const { user } = useAuth();

  return useMemo(() => customerPortalService.getCustomerPortalSnapshot(db, user), [db, user]);
}
