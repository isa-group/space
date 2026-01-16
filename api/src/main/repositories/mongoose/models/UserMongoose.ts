import bcrypt from 'bcryptjs';
import mongoose, { Document, Schema } from 'mongoose';
import { generateUserApiKey, hashPassword } from '../../../utils/users/helpers';
import { UserRole, USER_ROLES } from '../../../types/models/User';

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    minlength: 5,
    required: true,
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true // Only adds to the index if the field is present
  },
  role: {
    type: String,
    required: true,
    enum: USER_ROLES,
    default: USER_ROLES[USER_ROLES.length - 1]
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc, resultObject, options) {
      delete resultObject._id;
      delete resultObject.__v;
      delete resultObject.password;
      return resultObject;
    }
  }
});

// Verify password method
userSchema.methods.verifyPassword = async function(password: string) {
  return await bcrypt.compare(password, this.password);
};

userSchema.pre('save', async function(next) {
  const user = this;
  
  // If the password hasn't changed, we continue
  if (!user.isModified('password')) return next();

  try {
    user.password = await hashPassword(user.password);
    
    // If there's no API Key, we generate one
    if (!user.apiKey) {
      user.apiKey = generateUserApiKey();
    }
    
    next();
  } catch (error) {
    next(error as Error);
  }
});

export interface UserDocument extends Document {
  username: string;
  password: string;
  apiKey: string;
  role: UserRole;
  verifyPassword: (password: string) => Promise<boolean>;
}

const userModel = mongoose.model<UserDocument>('User', userSchema, 'users');

export default userModel;
