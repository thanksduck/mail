import mongoose from "mongoose";
import validator from "validator";
mongoose.ruleSchema = new mongoose.Schema({
    alias:{
        type: String,
        required: [true, "No Alias was provided"],
        lowercase: true,
        validator: [validator.isEmail, "Alias Can Only be an Email Address"],
    },
    ruleId: {
        type: String,
        required: [true, "Rule ID from the Cloudflare API"],
    },
    username: {
        type: String,
        required: [true, "username is must"],
    },
    destination: {
        type: String,
        required: [true, "destination address was not provided"],
    },
    created: {
        type: Date,
        default: Date.now(),
    },
    name: {
        type: String,
        default: "",
    },
    enabled: {
        type: Boolean,
        default: true,
    },
});


const Rule = mongoose.model("Rule", mongoose.ruleSchema);
export default Rule;