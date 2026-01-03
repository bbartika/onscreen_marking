import mongoose from "mongoose";

// const subjectFolderSchema = new mongoose.Schema({
//     folderName: {
//         type: String,
//         required: true
//     },
//     description: {
//         type: String,
//         required: true
//     },
//     allocated: {
//         type: Number,
//         required: true
//     },
//     unAllocated: {
//         type: Number,
//         required: true
//     },
//     evaluated: {
//         type: Number,
//         required: true
//     },
//     evaluation_pending: {
//         type: Number,
//         required: true
//     },
//     scannedFolder: {
//         type: Number,
//         required: true
//     },
//     createdAt: {
//         type: Date,
//         default: Date.now
//     },
//     updatedAt: {
//         type: Date,
//         default: Date.now
//     }
// });

const subjectFolderSchema = new mongoose.Schema({
  folderName: {
    type: String,
    required: true,
    unique: true
  },

  description: {
    type: String,
    default: ""   // ✅ NOT required
  },

  allocated: {
    type: Number,
    default: 0
  },

  unAllocated: {
    type: Number,
    default: 0
  },

  evaluated: {
    type: Number,
    default: 0
  },

  evaluation_pending: {
    type: Number,
    default: 0
  },

  scannedFolder: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("SubjectFolder", subjectFolderSchema);    