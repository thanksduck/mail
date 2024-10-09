import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import User from "../Models/userModel.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import CustomError from "../utils/CustomError.js";
import createSendResponse from "../utils/createSendResponse.js";
import { sendUser } from "../utils/safeResponseObject.js";

import jwt from "jsonwebtoken";




function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/v1/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, displayName, emails } = profile;
        const email = emails && emails[0]?.value;

        // Check if user already exists in the database
        let user = await User.findOne({ email });

        if (!user) {
          // Create a new user if not found
          user = new User({
            username: displayName,
            name: displayName,
            email,
            password: " ", // Set password as null since this is OAuth
            passwordConfirm: " ",
            active: true,
            providor: "google",
          });
          await user.save({ validateBeforeSave: false });
        }
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

// Middleware to handle Google login
export const googleLogin = asyncErrorHandler(async (req, res, next) => {
  passport.authenticate("google", { scope: ["profile", "email"] })(
    req,
    res,
    next
  );
});

// Middleware to handle Google OAuth callback
export const googleCallback = asyncErrorHandler(async (req, res, next) => {
  passport.authenticate("google", async (err, user, info) => {
    if (err || !user) {
      console.log(err);
      console.log(user);
      return res.redirect(`${process.env.FRONTEND}/login`);
    }
    const id = user.id || user._id;
    const safeUser = sendUser(user);

    // Generate JWT token
    const token = signToken(id);
    const options = {
      maxAge: process.env.COOCKIE_EXPIRES,
    };
    res.cookie("jwt", token, options);

    // Redirect to frontend with encrypted user data
    res.redirect(
      `${process.env.FRONTEND}/auth-success/google/?data=${encodeURIComponent(JSON.stringify(safeUser))}`
    );
  })(req, res, next);
});

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: "/api/v1/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, displayName, emails } = profile;
        const email = emails && emails[0]?.value;

        // Check if user already exists in the database
        let user = await User.findOne({ email });

        if (!user) {
          // Create a new user if not found
          user = await User.create({
            username: displayName,
            name: displayName,
            email,
            password: " ", // Set password as null since this is OAuth
            passwordConfirm: " ",
            active: true,
          });
        }

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

// Middleware to handle Facebook login callback
export const facebookCallback = asyncErrorHandler(async (req, res, next) => {
  passport.authenticate("facebook", async (err, user, info) => {
    if (err || !user) {
      return next(new CustomError("Facebook authentication failed", 401));
    }

    const id = user.id || user._id;
    const safeUser = sendUser(user);
    createSendResponse(safeUser, 200, res, "user", id);
  })(req, res, next);
});
