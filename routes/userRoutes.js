import express from "express";
import {
  getUser,
  updatePassword,
  deleteMe,
  updateMe,
} from "../Controller/User/userController.js";
import { listDestination } from "../Controller/Mail/dstController.js";
import { listRules } from "../Controller/Mail/mailController.js";
import { protect } from "../Controller/authController.js";
const router = express.Router();

router.route("/").get(protect, getUser);
router.route("/destination").get(protect, listDestination)
router.route("/destinations").get(protect, listDestination)
router.route("/aliases").get(protect, listRules);
router.route("/alias").get(protect, listRules);
router.route("/routing").get(protect, listRules);
router.route("/routings").get(protect, listRules);
router.route("/rule").get(protect, listRules);
router.route("/rules").get(protect, listRules);
router.route("/update-password").patch(protect, updatePassword);
router.route("/update").patch(protect, updateMe);
router.route("/delete").delete(protect, deleteMe);
export default router;
