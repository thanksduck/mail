import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../Models/userModel.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import CustomError from "../utils/CustomError.js";
import createSendResponse, { signToken } from "../utils/createSendResponse.js";
import { sendUser } from "../utils/safeResponseObject.js";



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
        
        let user = await User.findOne({ email });
        if (!user) {
          // Create a new user if not found
          user = new User({
            username: email,
            name: "Set Name",
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
  passport.authenticate("google", { scope: [ "email"] })(
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
      return res.redirect(`${process.env.FRONTEND}/login/failed`);
    }
    const id = user.id || user._id;

    // res.setHeader("Location", `${process.env.FRONTEND}/auth-success/google`);
    res.setHeader("token", signToken(id));
    res.redirect(`${process.env.FRONTEND}/auth-success/google?token=${encodeURIComponent(token)}`);
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


passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "/api/v1/auth/github/callback"
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails && profile.emails[0]?.value;

    let user = await User.findOne({ email });
    if (!user) {
      // Create a new user if not found
      user = new User({
        username: profile.username,
        name: profile.displayName || profile.username,
        email,
        password: " ", // Set password as null since this is OAuth
        passwordConfirm: " ",
        active: true,
        provider: "github",
      });
      await user.save({ validateBeforeSave: false });
    }
    done(null, user);
  } catch (error) {
    done(error, null);
  }
}
));

// Initiate GitHub Login
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/api/v1/auth/github/callback",
      scope: ['user:email'] // Add this line to request email scope
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, username, displayName, emails } = profile;
        const email = emails && emails[0]?.value;
        
        if (!email) {
          return done(new Error('No email found from GitHub'), null);
        }

        let user = await User.findOne({ email });
        if (!user) {
          // Create a new user if not found
          user = new User({
            username: username || email,
            name: displayName || username || "Set Name",
            email,
            password: " ", // Set password as empty string since this is OAuth
            passwordConfirm: " ",
            active: true,
            provider: "github",
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

// Initiate GitHub Login
export const githubLogin = asyncErrorHandler(async (req, res, next) => {
  passport.authenticate("github", { scope: ["user:email"] })(req, res, next);
});

// Middleware to handle GitHub OAuth callback
export const githubCallback = asyncErrorHandler(async (req, res, next) => {
  passport.authenticate("github", {
    failureRedirect: `${process.env.FRONTEND}/login/failed`
  }, async (err, user, info) => {
    if (err || !user) {
      console.log(err);
      console.log(user);
      return res.redirect(`${process.env.FRONTEND}/login/failed`);
    }
    const id = user.id || user._id;
    res.setHeader("token", signToken(id));
    res.redirect(`${process.env.FRONTEND}/auth-success/github?token=${encodeURIComponent(token)}`);
  })(req, res, next);
});