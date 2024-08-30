import express from "express";
import {
  getUser,
  updatePassword,
  deleteMe,
  updateMe,
  getUserRouting,
} from "../Controller/userController.js";
import { protect } from "../Controller/authController.js";
const router = express.Router();

router.route("/").get(protect, getUser);
router.route("/aliases").get(protect, getUserRouting);
router.route("/routing").get(protect, getUserRouting);
router.route("/rules").get(protect, getUserRouting);
router.route("/updatePassword").patch(protect, updatePassword);
router.route("/updateMe").patch(protect, updateMe);
router.route("/deleteMe").delete(protect, deleteMe);
export default router;
