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
  
  verified: {
    type: Date,
    default: null,
  },
},{ timestamps: true });
destSchema.index({ username: 1, domain: 1 });
destSchema.index({ username: 1, destination: 1 }, { unique: true });
const Destination = mongoose.model("Destination", destSchema);
export default Destination;
