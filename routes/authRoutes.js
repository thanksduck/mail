import { Router } from "express";
import { signup, login , forgetPassword, resetPassword } from "../Controller/authController.js";

const router = Router();

router
    .route("/signup")
    .post(signup);
router
    .route("/login")
    .post(login);
router
    .route("/forgetPassword")
    .post(forgetPassword);
router
    .route("/resetPassword/:token")
    .patch(resetPassword);

export default router;