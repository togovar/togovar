import SwaggerUI from 'swagger-ui';
import '../../stylesheets/api.sass';

const spec = require('./swagger-config.yaml');

SwaggerUI({
  spec,
  dom_id: '#swagger',
});
