import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    minlength: [4, "Username must be at least 4 characters"],
    maxlength: [15, "Username must be at most 15 characters"],
    required: [true, "Please provide your username"],
    unique: [true, "Username already taken"],
    lowercase: true,
    match: [
      /^[a-zA-Z][a-zA-Z0-9-_\.]{3,}$/,
      "Username cannot start with a number and can only contain letters, numbers, hyphens (-), underscores (_), and periods (.). No spaces allowed.",
    ],
  },
  name: {
    type: String,
    minlength: [4, "Name must be at least 4 characters"],
    maxlength: [64, "Name must be at most 64 characters"],
    required: [true, "Please provide your name"],
  },
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: [true, "An account with this email already exists"],
    lowercase: true,
    validate: [validator.isEmail, "Not a valid email"],
  },
  alias: {
    type: [
      {
        aliasEmail: {
          type: String,
          lowercase: true,
          required: true
        },
        destinationEmail: {
          type: String,
          lowercase: true,
          required: true
        },
        active: {
          type: Boolean,
          default: true
        }
      }
    ],
    default: []
  },
  aliasCount: {
    type: Number,
    default: 0,
  },
  destination: {
    type: [
      {
        destinationEmail: {
          type: String,
          lowercase: true,
          required: true
        },
        domain: {
          type: String,
          lowercase: true,
          required: true
        },
        verified: {
          type: Boolean,
          default: false
        }
      }
    ],
    default: []
  },
  destinationCount: {
    type: Number,
    default: 0,
  },
  isPremium: {
    type: Boolean,
    default: false,
    select: false,
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: [8, "Password must be at least 8 characters"],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the same",
    },
  },
  povidor: {
    type: String,
  },
  socialProfiles: {
    type: {
      github: String,
      google: String,
      facebook: String,
    },
  },
  avatar: {
    type: String,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    select: false,
    default: true,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});


userSchema.methods.setIsPremium = function () {
  this.isPremium = true;
  return this.save();
};

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.isPasswordChanged = async function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = async function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Encrypt the token and store it in the database
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // basically 10 minutes from now

  return resetToken;
};

const User = mongoose.model("User", userSchema);
export default User;