import container from '../config/container.js';
import OrganizationService from '../services/OrganizationService.js';

class OrganizationController {
  private organizationService: OrganizationService;

  constructor() {
    this.organizationService = container.resolve('organizationService');
    this.getAllOrganizations = this.getAllOrganizations.bind(this);
    this.getOrganizationById = this.getOrganizationById.bind(this);
    this.createOrganization = this.createOrganization.bind(this);
    this.addMember = this.addMember.bind(this);
    this.update = this.update.bind(this);
    this.addApiKey = this.addApiKey.bind(this);
    this.removeApiKey = this.removeApiKey.bind(this);
    this.removeMember = this.removeMember.bind(this);
  }

  async getAllOrganizations(req: any, res: any) {
    
    // Allows non-admin users to only see their own organizations
    if (req.user.role !== 'ADMIN') {
      req.query.owner = req.user.username;
    }

    const filters = req.query || {};
    
    return this.organizationService.findAll(filters);
  }

  async getOrganizationById(req: any, res: any) {

    const organizationId = req.params.organizationId;

    return this.organizationService.findById(organizationId);
  }

  async createOrganization(req: any, res: any) {
    const organizationData = req.body;
    
    return this.organizationService.create(organizationData);
  }

  async addMember(req: any, res: any) {
    const organizationId = req.params.organizationId;
    const { username } = req.body;

    return this.organizationService.addMember(organizationId, username);
  }

  async update(req: any, res: any) {
    const organizationId = req.params.organizationId;
    const updateData = req.body;

    return this.organizationService.update(organizationId, updateData);
  }

  async addApiKey(req: any, res: any) {
    const organizationId = req.params.organizationId;
    const { keyScope } = req.body;
    
    return this.organizationService.addApiKey(organizationId, keyScope);
  }

  async removeApiKey(req: any, res: any) {
    const organizationId = req.params.organizationId;
    const { apiKey } = req.body;

    return this.organizationService.removeApiKey(organizationId, apiKey);
  }

  async removeMember(req: any, res: any) {
    const organizationId = req.params.organizationId;
    const { username } = req.body;
    
    return this.organizationService.removeMember(organizationId, username);
  }
}

export default OrganizationController;
