import { Schema } from 'mongoose';

const organizationApiKeySchema = new Schema(
  {
    key: {
      type: String,
      required: true,
    },
    scope: {
      type: String,
      enum: ['ALL', 'MANAGEMENT', 'EVALUATION'],
      required: true,
      default: 'EVALUATION',
    },
  },
  { _id: false }
);

export default organizationApiKeySchema;
