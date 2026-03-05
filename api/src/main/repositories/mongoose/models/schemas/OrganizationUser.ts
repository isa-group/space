import { Schema } from 'mongoose';

const organizationUserSchema = new Schema(
  {
    username: {
      type: String,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['ADMIN', 'MANAGER', 'EVALUATOR'],
      required: true,
      default: 'EVALUATOR',
    },
  },
  { _id: false }
);

export default organizationUserSchema;
