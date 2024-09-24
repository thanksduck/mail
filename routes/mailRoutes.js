import express from "express";
import { protect } from "../Controller/authController.js";
import {
  listDestination,
  createDestination,
  deleteDestination,
  isVerified,
} from "../Controller/dstController.js";
import {
  createRule,
  readRule,
  updateRule,
  deleteRule,
  listRules,
} from "../Controller/mailController.js";
const router = express.Router();

router.route("/destination/:id/verify").get(protect, isVerified);
router.route("/destinations/:id/verify").get(protect, isVerified);

router
  .route("/destination")
  .get(protect, listDestination)
  .post(protect, createDestination);
router
  .route("/destinations")
  .get(protect, listDestination)
  .post(protect, createDestination);

router.route("/destination/:id").delete(protect, deleteDestination);


router.route("/rule").post(protect, createRule).get(protect, listRules);
router.route("/rules").post(protect, createRule).get(protect, listRules);

router
  .route("/rule/:id")
  .get(protect, readRule)
  .patch(protect, updateRule)
  .delete(protect, deleteRule);
router
  .route("/rules/:id")
  .get(protect, readRule)
  .patch(protect, updateRule)
  .delete(protect, deleteRule);


export default router;