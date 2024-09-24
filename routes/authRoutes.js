import { Router } from "express";
import { signup, login , forgetPassword, resetPassword, protect, logout } from "../Controller/authController.js";
const router = Router();

router
    .route("/signup")
    .post(signup);
router
    .route("/register")
    .post(signup);
router
    .route("/login")
    .post(login);
router
    .route("/forget-password")
    .post(forgetPassword);
router
    .route("/reset-password/:token")
    .patch(resetPassword);
router
    .route('/logout')
    .post(protect, logout);
export default router;