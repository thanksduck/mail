import express from "express";
import { protect } from "../Controller/authController.js";
import {
  listDestination,
  createDestination,
  deleteDestination,
  isVerified,
} from "../Controller/Mail/dstController.js";
import {
  createRule,
  readRule,
  updateRule,
  deleteRule,
  listRules,
} from "../Controller/Mail/mailController.js";

import {
  createRuleV2,
  deleteRuleV2,
  toggleRuleV2,
  updateRuleV2,
} from "../Controller/Mail/mailControllerV2.js";


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


router.route("/rule").post(protect, createRuleV2).get(protect, listRules);
router.route("/rules").post(protect, createRuleV2).get(protect, listRules);

router
  .route("/rule/:id")
  .get(protect, readRule)
  .patch(protect, updateRuleV2)
  .delete(protect, deleteRuleV2);
router
  .route("/rules/:id")
  .get(protect, readRule)
  .patch(protect, updateRuleV2)
  .delete(protect, deleteRuleV2);

router
  .route("/rule/:id/toggle")
  .patch(protect, toggleRuleV2);
router
  .route("/rules/:id/toggle")
  .patch(protect, toggleRuleV2);


export default router;