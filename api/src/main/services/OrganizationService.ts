import container from '../config/container';
import OrganizationRepository from '../repositories/mongoose/OrganizationRepository';
import { hashPassword } from '../utils/users/helpers';

class OrganizationService {
  private organizationRepository: OrganizationRepository;

  constructor() {
    this.organizationRepository = container.resolve('organizationRepository');
  }

  async findById(organizationId: string, ownerId: string) {
    const organization = await this.organizationRepository.findById(organizationId, ownerId);
    return organization;
  }
}

export default OrganizationService;
