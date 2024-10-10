import { Router } from "express";
import {
  signup,
  login,
  forgetPassword,
  resetPassword,
  protect,
  logout,
} from "../Controller/authController.js";
import {
  facebookCallback,
  githubCallback,
  githubLogin,
  googleCallback,
  googleLogin,
} from "../Controller/auth2.js";
const router = Router();

router.route("/signup").post(signup);
router.route("/register").post(signup);
router.route("/login").post(login);
router.route("/forget-password").post(forgetPassword);
router.route("/reset-password/:token").patch(resetPassword);
router.route("/logout").post(protect, logout);

router.route("/google").get(googleLogin);
router.route("/google/callback").get(googleCallback);
router.route("/facebook/callback").get(facebookCallback);

router.route("/github").get(githubLogin);
router.route("/github/callback").get(githubCallback);
export default router;
