import mongoose from "mongoose";

/* -------------------------------------------------------------------------- */
/*                           USER   SCHEMA                                    */
/* -------------------------------------------------------------------------- */

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  subjectCode: {
    type: [String],
    require: false,
  },
  maxBooklets: {
    type: Number,
    required: false,
  },
  efficiency: {
    type: [Number],
    default: [],
  },
  permissions: {
    type: Array,
    default: [],
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", UserSchema);
export default User;
