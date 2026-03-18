import { adjustProductStock } from "../../services/products/productsService";
import { withPersistPlan } from "./repositoryResult";

export function createProductsRepository() {
  return {
    adjustStock(db, productId, payload) {
      return withPersistPlan(adjustProductStock(db, productId, payload), ["products", "productMovements"]);
    }
  };
}

