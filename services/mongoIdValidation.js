import mongoose from "mongoose";

/* -------------------------------------------------------------------------- */
/*                           MONGODB ID VERIFICATION                          */
/* -------------------------------------------------------------------------- */

export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);