import mongoose, { Schema } from 'mongoose';
import OrganizationApiKey from './schemas/OrganizationApiKey';
import OrganizationUser from './schemas/OrganizationUser';



const organizationSchema = new Schema(
  {
    name: { type: String, required: true },
    owner: { 
      type: String,
      ref: 'User',
      required: true
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

organizationSchema.virtual('ownerDetails', {
  ref: 'User',         // El modelo donde buscar
  localField: 'owner',  // El campo en Organization (que tiene el username)
  foreignField: 'username', // El campo en User donde debe buscar ese valor
  justOne: true         // Queremos un objeto, no un array
});

// Adding indexes
organizationSchema.index({ name: 1 });
organizationSchema.index({ 'apiKeys.key': 1 }, { sparse: true });
organizationSchema.index({ members: 1 });

const organizationModel = mongoose.model('Organization', organizationSchema, 'organizations');

export default organizationModel;

