import { NextFunction } from 'express';
import container from '../config/container';

// Middleware to verify API Key
const authenticateApiKey = async (req: any, res: any, next: NextFunction) => {
  const userService = container.resolve('userService');
  
  // Get the API Key from the header
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).send({ error: 'API Key not found. Please ensure to add an API Key as value of the "x-api-key" header.' });
  }

  try {
    const user = await userService.findByApiKey(apiKey);
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).send({ error: 'Invalid API Key' });
  }
};

// Middleware to verify role and permissions
// const hasPermission = (req: any, res: any, next: NextFunction) => {
//   try {
//     if (!req.user) {
//       return res.status(403).send({ error: 'User not authenticated' });
//     }

//     const roleId: UserRole = req.user.role ?? USER_ROLES[USER_ROLES.length - 1];
//     const role = ROLE_PERMISSIONS[roleId];

//     if (!role) {
//       return res.status(403).send({ error: `Your role does not have permissions. Current role: ${roleId}`});
//     }

//     const method: string = req.method;
//     const module = req.path.split(`${process.env.BASE_URL_PATH ?? "/api/v1"}`)[1].split('/')[1];

//     if (role.allowAll){
//       return next();
//     }

//     if (role.blockedMethods && Object.keys(role.blockedMethods).includes(method.toUpperCase())) {
//       const blockedModules = role.blockedMethods[method.toUpperCase() as RestOperation];
      
//       if (blockedModules?.includes("*") || blockedModules?.some(service => module.startsWith(service))) {
//         return res.status(403).send({ error: `Operation not permitted with your role. Current role: ${roleId}` });
//       }
//     }
    
//     // If the method is not blocked, and no configuration of allowance is set, allow the request
//     if (!role.allowedMethods){
//       return next();
//     }

//     if (role.allowedMethods && Object.keys(role.allowedMethods).includes(method.toUpperCase())) {
//       const allowedModules = role.allowedMethods[method.toUpperCase() as RestOperation];

//       if (allowedModules?.includes("*") || allowedModules?.some(service => module.startsWith(service))) {
//         return next();
//       }
//     }

//     return res.status(403).send({ error: `Operation not permitted with your role. Current role: ${roleId}` });

//   } catch (error) {
//     return res.status(500).send({ error: 'Error verifying permissions' });
//   }
// };

export { authenticateApiKey };
