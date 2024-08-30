
import mongoose from "mongoose";

const destSchema = new mongoose.Schema({
    destination: {
        type: String,
        default: "",
        required: [true, "Please provide a destination address"],
    },
    username: {
        type: String,
        default: "",
        required: [true, "Please provide a username"],
    },
    destinationId: {
        type: String,
        default: "",
        required: [true, "ID from the Cloudflare Portal"],
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
        default: null
    },
});

const Destination = mongoose.model("Destination", destSchema);
export default Destination;