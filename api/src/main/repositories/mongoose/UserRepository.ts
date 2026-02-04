import { toPlainObject } from '../../utils/mongoose';
import RepositoryBase from '../RepositoryBase';
import UserMongoose from './models/UserMongoose';
import { LeanUser } from '../../types/models/User';
import { UserRole } from '../../types/permissions';
import { generateUserApiKey } from '../../utils/users/helpers';

class UserRepository extends RepositoryBase {
  async findByUsername(username: string) {
    try {
      const user = await UserMongoose.findOne({ username }).exec();

      if (!user) return null;

      return toPlainObject<LeanUser>(user.toJSON());
    } catch (err) {
      return null;
    }
  }

  async authenticate(username: string, password: string): Promise<LeanUser | null> {
    const user = await UserMongoose.findOne({ username }).exec();

    if (!user) return null;

    const isPasswordValid = await user.verifyPassword(password);

    if (!isPasswordValid) return null;

    const leanUser = toPlainObject<LeanUser>(user.toJSON());

    if (!leanUser.apiKey) {
      // If the user does not have an API key, we generate one
      const newApiKey = generateUserApiKey();
      await UserMongoose.updateOne({ username }, { apiKey: newApiKey });
      
      return leanUser;
    }

    return leanUser;
  }

  async findByApiKey(apiKey: string) {
    const user = await UserMongoose.findOne({ apiKey: apiKey });

    if (!user) return null;

    return toPlainObject<LeanUser>(user.toObject());
  }

  async create(userData: any): Promise<LeanUser> {
    const user = await new UserMongoose(userData).save();
    const userObject = await this.findByUsername(user.username);

    return userObject!;
  }

  async update(username: string, userData: any) {
    const updatedUser = await UserMongoose.findOneAndUpdate({ username: username }, userData, {
      new: true,
      projection: { password: 0 },
    })

    if (!updatedUser) {
      throw new Error('INVALID DATA: User not found');
    }
    
    return toPlainObject<LeanUser>(updatedUser.toJSON());
  }

  async regenerateApiKey(username: string) {
    const updatedUser = await UserMongoose.findOneAndUpdate(
      { username: username },
      { apiKey: generateUserApiKey() },
      { new: true, projection: { password: 0 } }
    );

    return toPlainObject<LeanUser>(updatedUser?.toJSON()).apiKey;
  }

  async destroy(username: string) {
    const result = await UserMongoose.deleteOne({ username: username });
    return result?.deletedCount === 1;
  }

  async findAll() {
    try {
      const users = await UserMongoose.find({}, { password: 0 });
      return users.map(user => user.toObject({ getters: true, virtuals: true, versionKey: false }));
    } catch (err) {
      return [];
    }
  }

  async changeRole(username: string, role: UserRole) {
    return this.update(username, { role });
  }
}

export default UserRepository;
