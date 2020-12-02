import SwaggerUI from 'swagger-ui';
import '../../stylesheets/api.sass';

const spec = require('../../../../doc/api/v1.yml.erb');

SwaggerUI({
  spec,
  dom_id: '#swagger',
});
