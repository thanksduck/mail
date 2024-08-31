import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    minlength: [4, "Username must be at least 4 characters"],
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
    type: [String],
    default: [],
  },
  aliasCount: {
    type: Number,
    default: 0,
  },
  destination: {
    type: [String],
    default: [],
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
userSchema.pre("save", async function (next) {
  const user = this;
  if (user.isModified("destination")) {
    const existingUser = await User.findOne({
      destination: { $in: user.destination },
    });
    if (existingUser) {
      const error = new Error("Duplicate destination found");
      return next(error);
    }
    user.destinationCount = user.destination.length;
  }
  if (user.isModified("alias")) {
    const existingUser = await User.findOne({ alias: { $in: user.alias } });
    if (existingUser) {
      const error = new Error("Duplicate alias found");
      return next(error);
    }
    user.aliasCount = user.alias.length;
  }
  next();
});

userSchema.methods.setAlias = function (alias) {
  this.alias.push(alias);
  return this.save();
};
userSchema.methods.setDestination = function (destination) {
  this.destination.push(destination);
  return this.save();
};
userSchema.methods.removeAlias = function (alias) {
  this.alias = this.alias.filter((a) => a !== alias);
  return this.save();
};
userSchema.methods.removeDestination = function (destination) {
  this.destination = this.destination.filter((d) => d !== destination);
  return this.save();
};
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
