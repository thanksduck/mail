import mongoose from "mongoose";
import validator from "validator";
const destSchema = new mongoose.Schema({
  destination: {
    type: String,
    required: [true, "Destination Field is Required"],
    unique: [true, "Destination Already Exists"],
    lowercase: true,
    validate: [validator.isEmail, "Not a valid email"],
  },
  username: {
    type: String,
    required: [true, "Please provide a username"],
  },
  destinationId: {
    type: String,
    required: [true, "ID from the Cloudflare Portal"],
  },
  domain: {
    type: String,
    required: [true, "Domain Field is Required"],
    lowercase: true,
  },
  created: {
    type: Date,
    select: false,
    default: Date.now(),
  },
  modefied: {
    type: Date,
    select: false,
    default: Date.now(),
  },
  verified: {
    type: Date,
    default: null,
  },
});

const Destination = mongoose.model("Destination", destSchema);
export default Destination;
