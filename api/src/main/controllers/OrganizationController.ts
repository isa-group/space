import container from '../config/container.js';
import OrganizationService from '../services/OrganizationService.js';

class OrganizationController {
  private organizationService: OrganizationService;

  constructor() {
    this.organizationService = container.resolve('organizationService');
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.create = this.create.bind(this);
    this.addMember = this.addMember.bind(this);
    this.updateMemberRole = this.updateMemberRole.bind(this);
    this.update = this.update.bind(this);
    this.addApiKey = this.addApiKey.bind(this);
    this.removeApiKey = this.removeApiKey.bind(this);
    this.removeMember = this.removeMember.bind(this);
    this.delete = this.delete.bind(this);
  }

  async getAll(req: any, res: any) {
    try {
      // Allows non-admin users to only see their own organizations
      if (req.user.role !== 'ADMIN') {
        req.query.owner = req.user.username;
      }

      const filters = req.query || {};
      const organizations = await this.organizationService.findAll(filters);
      res.json(organizations);
    } catch (err: any) {
      if (err.message.includes('PERMISSION ERROR')) {
        return res.status(403).send({ error: err.message });
      }
      res.status(500).send({ error: err.message });
    }
  }

  async getById(req: any, res: any) {
    try {
      const organizationId = req.params.organizationId;
      const organization = await this.organizationService.findById(organizationId);
      
      if (!organization) {
        return res.status(404).send({ error: `Organization with ID ${organizationId} not found` });
      }

      res.json(organization);
    } catch (err: any) {
      if (err.message.includes('PERMISSION ERROR')) {
        return res.status(403).send({ error: err.message });
      }
      res.status(500).send({ error: err.message });
    }
  }

  async create(req: any, res: any) {
    try {
      const organizationData = req.body;
      const organization = await this.organizationService.create(organizationData, req.user);
      res.status(201).json(organization);
    } catch (err: any) {
      if (err.message.includes('PERMISSION ERROR')) {
        return res.status(403).send({ error: err.message });
      }
      if (err.message.includes('does not exist') || err.message.includes('not found')) {
        return res.status(400).send({ error: err.message });
      }
      if (err.message.includes('CONFLICT')) {
        return res.status(409).send({ error: err.message });
      }
      res.status(500).send({ error: err.message });
    }
  }

  async addMember(req: any, res: any) {
    try {
      const organizationId = req.params.organizationId;
      const { username, role } = req.body;

      if (!organizationId) {
        return res.status(400).send({ error: 'organizationId query parameter is required' });
      }

      if (!username) {
        return res.status(400).send({ error: 'username field is required' });
      }

      await this.organizationService.addMember(organizationId, {username, role}, req.user);
      res.json({ message: 'Member added successfully' });
    } catch (err: any) {
      if (err.message.includes('PERMISSION ERROR')) {
        return res.status(403).send({ error: err.message });
      }
      if (err.message.includes('INVALID DATA')) {
        return res.status(400).send({ error: err.message });
      }
      res.status(500).send({ error: err.message });
    }
  }
  
  async updateMemberRole(req: any, res: any) {
    try {
      const organizationId = req.params.organizationId;
      const username = req.params.username;
      const { role } = req.body;

      if (!organizationId) {
        return res.status(400).send({ error: 'organizationId query parameter is required' });
      }

      if (!username) {
        return res.status(400).send({ error: 'username field is required' });
      }

      await this.organizationService.updateMemberRole(organizationId, username, role, req.user);
      
      const updatedOrganization = await this.organizationService.findById(organizationId);
      res.json(updatedOrganization);
    } catch (err: any) {
      if (err.message.includes('PERMISSION ERROR')) {
        return res.status(403).send({ error: err.message });
      }
      if (err.message.includes('INVALID DATA')) {
        return res.status(400).send({ error: err.message });
      }
      if (err.message.includes('CONFLICT')) {
        return res.status(409).send({ error: err.message });
      }
      res.status(500).send({ error: err.message });
    }
  }

  async update(req: any, res: any) {
    try {
      const organizationId = req.params.organizationId;
      const updateData = req.body;

      const organization = await this.organizationService.findById(organizationId);
      if (!organization) {
        return res.status(404).send({ error: `Organization with ID ${organizationId} not found` });
      }

      await this.organizationService.update(organizationId, updateData, req.user);
      
      const updatedOrganization = await this.organizationService.findById(organizationId);
      res.json(updatedOrganization);
    } catch (err: any) {
      if (err.message.includes('PERMISSION ERROR')) {
        return res.status(403).send({ error: err.message });
      }
      if (err.message.includes('INVALID DATA') || err.message.includes('does not exist')) {
        return res.status(400).send({ error: err.message });
      }
      if (err.message.includes('CONFLICT')) {
        return res.status(409).send({ error: err.message });
      }
      res.status(500).send({ error: err.message });
    }
  }

  async addApiKey(req: any, res: any) {
    try {
      const organizationId = req.params.organizationId;
      const { keyScope } = req.body;

      if (!organizationId) {
        return res.status(400).send({ error: 'organizationId query parameter is required' });
      }

      if (!keyScope) {
        return res.status(400).send({ error: 'keyScope field is required' });
      }

      await this.organizationService.addApiKey(organizationId, keyScope, req.user);
      res.json({ message: 'API key added successfully' });
    } catch (err: any) {
      if (err.message.includes('PERMISSION ERROR')) {
        return res.status(403).send({ error: err.message });
      }else if (err.message.includes('INVALID DATA')) {
        return res.status(400).send({ error: err.message });
      }
      res.status(500).send({ error: err.message });
    }
  }

  async removeApiKey(req: any, res: any) {
    try {
      const organizationId = req.params.organizationId;
      const apiKey = req.params.apiKey;

      if (!organizationId) {
        return res.status(400).send({ error: 'organizationId query parameter is required' });
      }

      if (!apiKey) {
        return res.status(400).send({ error: 'apiKey field is required' });
      }

      await this.organizationService.removeApiKey(organizationId, apiKey, req.user);
      res.json({ message: 'API key removed successfully' });
    } catch (err: any) {
      if (err.message.includes('PERMISSION ERROR')) {
        return res.status(403).send({ error: err.message });
      }
      if (err.message.includes('not found')) {
        return res.status(400).send({ error: err.message });
      }
      res.status(500).send({ error: err.message });
    }
  }

  async removeMember(req: any, res: any) {
    try {
      const organizationId = req.params.organizationId;
      const username = req.params.username;

      if (!organizationId) {
        return res.status(400).send({ error: 'organizationId parameter is required' });
      }

      if (!username) {
        return res.status(400).send({ error: 'username parameter is required' });
      }

      await this.organizationService.removeMember(organizationId, username, req.user);
      res.json({ message: 'Member removed successfully' });
    } catch (err: any) {
      if (err.message.includes('PERMISSION ERROR')) {
        return res.status(403).send({ error: err.message });
      }
      if (err.message.includes('not found')) {
        return res.status(400).send({ error: err.message });
      }
      res.status(500).send({ error: err.message });
    }
  }

  async delete(req: any, res: any) {
    try {
      const organizationId = req.params.organizationId;

      await this.organizationService.destroy(organizationId, req.user);

      res.status(204).json({ message: 'Organization deleted successfully' });
    } catch (err: any) {
      if (err.message.includes('PERMISSION ERROR')) {
        return res.status(403).send({ error: err.message });
      }
      if (err.message.includes('CONFLICT')) {
        return res.status(409).send({ error: err.message });
      }
      res.status(500).send({ error: err.message });
    }
  }
}

export default OrganizationController;
