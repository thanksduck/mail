import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../Models/userModel.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import CustomError from "../utils/CustomError.js";
import createSendResponse, { signToken } from "../utils/createSendResponse.js";
import { sendUser } from "../utils/safeResponseObject.js";
import bcrypt from "bcryptjs";

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/v1/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract data from profile
        const { id, displayName, emails, photos, name } = profile;

        // Validate email
        const email =
          (emails && emails.find((e) => e.verified)?.value) ||
          emails?.[0]?.value;
        if (!email) {
          return done(new Error("No valid email found from Google"), null);
        }

        // Create a username from email
        const googleUsername = email.split("@")[0];

        // Find user by email or Google ID
        let user = await User.findOne({
          $or: [{ email }, { "socialProfiles.google": id }],
        });

        if (user) {
          // Update existing user information
          user.name =
            user.name ||
            displayName ||
            `${name?.givenName || ""} ${name?.familyName || ""}`.trim();
          user.socialProfiles = user.socialProfiles || {};
          user.socialProfiles.google = id;
          user.avatar = user.avatar || photos?.[0]?.value;
          await user.save({ validateBeforeSave: false });
        } else {
          // Create a new user
          user = new User({
            username: googleUsername,
            name:
              displayName ||
              `${name?.givenName || ""} ${name?.familyName || ""}`.trim() ||
              googleUsername,
            email,
            password: await bcrypt.hash(Math.random().toString(36), 10), // Generate a random hashed password
            passwordConfirm: " ", // Not needed for OAuth
            active: true,
            provider: "google",
            socialProfiles: { google: id },
            avatar: photos?.[0]?.value,
          });
          await user.save({ validateBeforeSave: false });
        }

        done(null, user);
      } catch (error) {
        console.error("Error in Google authentication:", error);
        done(error, null);
      }
    }
  )
);

// Middleware to handle Google login
export const googleLogin = asyncErrorHandler(async (req, res, next) => {
  passport.authenticate("google", { scope: ["email"] })(req, res, next);
});

// Middleware to handle Google OAuth callback
export const googleCallback = asyncErrorHandler(async (req, res, next) => {
  passport.authenticate("google", async (err, user, info) => {
    if (err || !user) {
      console.log(err);
      console.log(user);
      return res.redirect(`${process.env.FRONTEND}/login/failed`);
    }
    const id = user.id || user._id;

    const token = signToken(id);
    res.setHeader("token", signToken(id));
    res.redirect(
      `${process.env.FRONTEND}/auth-success/google/${encodeURIComponent(token)}`
    );
  })(req, res, next);
});

// GitHub OAuth Strategy

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/api/v1/auth/github/callback",
      scope: ["user:email"], // Request email scope
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract data from profile
        const { id, username, displayName, emails, photos } = profile;

        // Validate email
        const email =
          (emails && emails.find((e) => e.primary)?.value) ||
          emails?.[0]?.value;
        if (!email) {
          return done(new Error("No valid email found from GitHub"), null);
        }

        // Validate username
        const githubUsername = username || email.split("@")[0];

        // Find user by email or GitHub username
        let user = await User.findOne({
          $or: [{ email }, { "socialProfiles.github": githubUsername }],
        });

        if (user) {
          // Update existing user information
          user.name = user.name || displayName || githubUsername;
          user.socialProfiles = user.socialProfiles || {};
          user.socialProfiles.github = githubUsername;
          user.avatar = user.avatar || photos?.[0]?.value;
          await user.save({ validateBeforeSave: false });
        } else {
          // Create a new user
          user = new User({
            username: githubUsername,
            name: displayName || githubUsername,
            email,
            password: await bcrypt.hash(Math.random().toString(36), 10), // Generate a random hashed password
            passwordConfirm: " ", // Not needed for OAuth
            active: true,
            provider: "github",
            socialProfiles: { github: githubUsername },
            avatar: photos?.[0]?.value,
          });
          await user.save({ validateBeforeSave: false });
        }

        done(null, user);
      } catch (error) {
        console.error("Error in GitHub authentication:", error);
        done(error, null);
      }
    }
  )
);

export const githubLogin = asyncErrorHandler(async (req, res, next) => {
  passport.authenticate("github", { scope: ["user:email"] })(req, res, next);
});

export const githubCallback = asyncErrorHandler(async (req, res, next) => {
  passport.authenticate(
    "github",
    {
      failureRedirect: `${process.env.FRONTEND}/login/failed`,
    },
    async (err, user, info) => {
      if (err || !user) {
        console.log(err);
        console.log(user);
        return res.redirect(`${process.env.FRONTEND}/login/failed`);
      }
      const id = user.id || user._id;
      const token = signToken(id);
      res.redirect(
        `${process.env.FRONTEND}/auth-success/github/${encodeURIComponent(
          token
        )}`
      );
    }
  )(req, res, next);
});

// Facebook OAuth Strategy
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
