import mongoose, { Schema } from 'mongoose';
import OrganizationApiKey from './schemas/OrganizationApiKey';
import OrganizationUser from './schemas/OrganizationUser';



const organizationSchema = new Schema(
  {
    name: { type: String, required: true },
    owner: { 
      type: String,
      ref: 'User'
    },
    apiKeys: { type: [OrganizationApiKey], default: [] },
    members: {
      type: [OrganizationUser],
      default: []
    }
  },
  {
    toObject: {
      virtuals: true,
      transform: function (doc, resultObject, options) {
        delete resultObject._id;
        delete resultObject.__v;
        return resultObject;
      },
    },
  }
);

// Adding unique index for [name, owner, version]
organizationSchema.index({ name: 1 });
organizationSchema.index({ apiKeys: 1 }, { unique: true });
organizationSchema.index({ members: 1 }, { unique: true });

const organizationModel = mongoose.model('Organization', organizationSchema, 'organizations');

export default organizationModel;