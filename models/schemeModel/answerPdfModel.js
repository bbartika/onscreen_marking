import mongoose from "mongoose";

const answerPdfSchema = new mongoose.Schema(
  {
    schemaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schema",
      required: true,
      index: true,
    },

    fileName: {
      type: String,
      required: true,
    },

    filePath: {
      type: String,
      required: true,
    },

    fileSize: {
      type: Number,
      required: true,
    },

    uploadType: {
      type: String,
      enum: ["DIRECT_PDF", "ZIP_EXTRACTED"],
      required: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// ✅ DIFFERENT MODEL NAME
const SchemaAnswerPdf =
  mongoose.models.SchemaAnswerPdf ||
  mongoose.model("SchemaAnswerPdf", answerPdfSchema);

export default SchemaAnswerPdf;
