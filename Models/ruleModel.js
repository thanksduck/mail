import mongoose from "mongoose";
import validator from "validator";

const ruleSchema = new mongoose.Schema({
    alias: {
        type: String,
        required: [true, "No Alias was provided"],
        lowercase: true,
        unique: [true, "Alias Already Exists"],
        validate: [validator.isEmail, "Alias Can Only be an Email Address"],
    },
    ruleId: {
        type: String,
        required: [true, "Rule ID from the Cloudflare API"],
    },
    username: {
        type: String,
        required: [true, "Username is required"],
    },
    destination: {
        type: String,
        required: [true, "Destination address was not provided"],
    },
    name: {
        type: String,
        default: "",
    },
    enabled: {
        type: Boolean,
        default: true,
    }
}, { timestamps: true });

ruleSchema.index({ username: 1 });

const Rule = mongoose.model("Rule", ruleSchema); 

export default Rule;