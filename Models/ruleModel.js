import mongoose from "mongoose";

mongoose.ruleSchema = new mongoose.Schema({
    alias:{
        type: String,
        default: "",
        required: [true, "No Alias was provided"],
    },
    ruleId: {
        type: String,
        default: "",
        required: [true, "Rule ID from the Cloudflare API"],
    },
    username: {
        type: String,
        default: "",
        required: [true, "username is must"],
    },
    destination: {
        type: String,
        default: "",
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