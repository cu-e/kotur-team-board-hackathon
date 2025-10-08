import { Router } from 'express';
import { AuthController } from './controllers/AuthController';
import { GroupController } from './controllers/GroupController';
import { BoardController } from './controllers/BoardController';
import { TaskController } from './controllers/TaskController';
import { IntegrationsController } from './controllers/IntegrationsController';
import { TemplatesController } from './controllers/TemplatesController';
import { IntegrationController } from './controllers/IntegrationController';

export const routes = Router();

routes.use('/auth', AuthController);
routes.use('/groups', GroupController);
routes.use('/boards', BoardController);
routes.use('/tasks', TaskController);
routes.use('/integrations', IntegrationsController); // небольшое легаси
routes.use('/', IntegrationController); // /groups/:groupId/integrations
routes.use('/templates', TemplatesController);
