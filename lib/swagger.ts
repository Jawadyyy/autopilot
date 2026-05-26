import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DB Autopilot API',
      version: '1.0.0',
      description: 'Self-Monitoring, Self-Healing Database Management System',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'admin' },
            password: { type: 'string', example: 'Admin@123' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', example: 'john' },
            email:    { type: 'string', example: 'john@example.com' },
            password: { type: 'string', example: 'John@123' },
            role:     { type: 'string', enum: ['db_viewer', 'db_operator', 'db_admin'], example: 'db_viewer' },
          },
        },
        ConnectionRequest: {
          type: 'object',
          required: ['name', 'host', 'port', 'db_name', 'username', 'password', 'db_type'],
          properties: {
            name:     { type: 'string',  example: 'My Postgres DB' },
            host:     { type: 'string',  example: 'localhost' },
            port:     { type: 'integer', example: 5432 },
            db_name:  { type: 'string',  example: 'mydb' },
            username: { type: 'string',  example: 'postgres' },
            password: { type: 'string',  example: 'secret' },
            db_type:  { type: 'string',  enum: ['postgresql', 'mssql'] },
          },
        },
        RuleRequest: {
          type: 'object',
          required: ['name', 'issue_type', 'trigger_condition', 'action_description'],
          properties: {
            name:                { type: 'string', example: 'Auto index slow queries' },
            issue_type:          { type: 'string', enum: ['slow_query', 'missing_index', 'deadlock', 'table_bloat', 'idle_connections', 'lock_contention', 'long_transaction', 'unused_index'] },
            trigger_condition:   { type: 'string', example: 'Sequential scan on table with over 10000 rows' },
            action_sql_template: { type: 'string', example: 'CREATE INDEX ON {table} ({column})' },
            action_description:  { type: 'string', example: 'Creates a B-tree index' },
            mode:                { type: 'string', enum: ['auto', 'suggest', 'off'], example: 'suggest' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data:    { },
            error:   { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/api/auth': {
        get: {
          tags: ['Auth'],
          summary: 'Get current logged in user',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Current user info' }, 401: { description: 'Unauthorized' } },
        },
        post: {
          tags: ['Auth'],
          summary: 'Login or Register',
          security: [],
          parameters: [{
            in: 'query', name: 'action', required: true,
            schema: { type: 'string', enum: ['login', 'register'] },
          }],
          requestBody: {
            content: {
              'application/json': {
                schema: { oneOf: [{ $ref: '#/components/schemas/LoginRequest' }, { $ref: '#/components/schemas/RegisterRequest' }] },
              },
            },
          },
          responses: { 200: { description: 'Token and user info' }, 401: { description: 'Invalid credentials' } },
        },
      },
      '/api/connections': {
        get: {
          tags: ['Connections'],
          summary: 'List all monitored connections',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'List of connections' } },
        },
        post: {
          tags: ['Connections'],
          summary: 'Register or test a new connection',
          security: [{ bearerAuth: [] }],
          parameters: [{
            in: 'query', name: 'action', required: false,
            schema: { type: 'string', enum: ['test'] },
            description: 'Pass action=test to test without saving',
          }],
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ConnectionRequest' } } },
          },
          responses: { 201: { description: 'Connection created' }, 200: { description: 'Test result' } },
        },
        patch: {
          tags: ['Connections'],
          summary: 'Pause or resume a connection',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'query', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', enum: ['active', 'paused'] } } } } },
          },
          responses: { 200: { description: 'Updated connection' } },
        },
        delete: {
          tags: ['Connections'],
          summary: 'Delete a connection',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'query', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },
      '/api/monitor': {
        get: {
          tags: ['Monitor'],
          summary: 'Get monitoring data from an external database',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'connectionId', required: true,  schema: { type: 'string' } },
            { in: 'query', name: 'type',         required: false, schema: { type: 'string', enum: ['metrics', 'slow_queries', 'locks', 'deadlocks', 'bloat'] } },
          ],
          responses: { 200: { description: 'Monitoring data' } },
        },
        post: {
          tags: ['Monitor'],
          summary: 'Trigger a manual monitoring scan',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: { connectionId: { type: 'string' } } } } },
          },
          responses: { 200: { description: 'Scan triggered' } },
        },
      },
      '/api/autopilot': {
        get: {
          tags: ['Autopilot'],
          summary: 'Get rules, actions or effectiveness',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'query', name: 'type', schema: { type: 'string', enum: ['rules', 'actions', 'effectiveness'] } }],
          responses: { 200: { description: 'Autopilot data' } },
        },
        post: {
          tags: ['Autopilot'],
          summary: 'Create rule, apply fix or dismiss issue',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'query', name: 'action', schema: { type: 'string', enum: ['create_rule', 'apply_fix', 'dismiss'] } }],
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RuleRequest' } } },
          },
          responses: { 200: { description: 'Success' }, 201: { description: 'Created' } },
        },
        patch: {
          tags: ['Autopilot'],
          summary: 'Update rule mode or toggle active',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'query', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: { mode: { type: 'string', enum: ['auto', 'suggest', 'off'] }, is_active: { type: 'boolean' } } } } },
          },
          responses: { 200: { description: 'Updated rule' } },
        },
        delete: {
          tags: ['Autopilot'],
          summary: 'Delete a rule',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'query', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' } },
        },
      },
      '/api/plans': {
        get: {
          tags: ['Query Plans'],
          summary: 'Get captured query plans',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'connectionId', schema: { type: 'string' } },
            { in: 'query', name: 'issueId',      schema: { type: 'string' } },
            { in: 'query', name: 'hasSeqScan',   schema: { type: 'boolean' } },
          ],
          responses: { 200: { description: 'Query plans' } },
        },
        post: {
          tags: ['Query Plans'],
          summary: 'Capture EXPLAIN ANALYZE from external DB',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: {
              connectionId: { type: 'string' },
              queryText:    { type: 'string', example: 'SELECT * FROM users WHERE email = \'test@test.com\'' },
              planType:     { type: 'string', enum: ['before_fix', 'after_fix'] },
              issueId:      { type: 'string' },
            } } } },
          },
          responses: { 201: { description: 'Plan captured' } },
        },
      },
      '/api/reports': {
        get: {
          tags: ['Reports'],
          summary: 'Get performance reports',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'type',         schema: { type: 'string', enum: ['performance', 'health', 'trend', 'issues'] } },
            { in: 'query', name: 'connectionId', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Report data' } },
        },
      },
      '/api/roles': {
        get: {
          tags: ['Security'],
          summary: 'Get roles, privileges or RLS policies',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'connectionId', required: true, schema: { type: 'string' } },
            { in: 'query', name: 'type', schema: { type: 'string', enum: ['roles', 'privileges', 'rls'] } },
          ],
          responses: { 200: { description: 'Security data' } },
        },
        post: {
          tags: ['Security'],
          summary: 'Create role, grant or revoke privileges',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'query', name: 'action', schema: { type: 'string', enum: ['create_role', 'grant', 'revoke', 'enable_rls'] } }],
          responses: { 200: { description: 'Success' } },
        },
      },
      '/api/backup': {
        get: {
          tags: ['Backup'],
          summary: 'Get backup history',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'query', name: 'connectionId', schema: { type: 'string' } }],
          responses: { 200: { description: 'Backup records' } },
        },
        post: {
          tags: ['Backup'],
          summary: 'Run backup or restore',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'query', name: 'action', schema: { type: 'string', enum: ['backup', 'restore'] } }],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: { connectionId: { type: 'string' }, backupId: { type: 'string' } } } } },
          },
          responses: { 201: { description: 'Backup started' } },
        },
      },
      '/api/olap': {
        get: {
          tags: ['OLAP'],
          summary: 'Get OLAP analytics data',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'type', schema: { type: 'string', enum: ['heatmap', 'trend', 'summary'] } },
            { in: 'query', name: 'days', schema: { type: 'integer', example: 30 } },
          ],
          responses: { 200: { description: 'OLAP data' } },
        },
        post: {
          tags: ['OLAP'],
          summary: 'Run dynamic CUBE/ROLLUP query',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: {
              dimensions: { type: 'array', items: { type: 'string', enum: ['issue_type', 'db_name', 'hour', 'day', 'severity', 'fix_type'] } },
              measures:   { type: 'array', items: { type: 'string', enum: ['total_incidents', 'resolved_count', 'avg_resolution_mins', 'fix_success_rate'] } },
              filters:    { type: 'object', properties: { startDate: { type: 'string' }, endDate: { type: 'string' }, dbName: { type: 'string' }, issueType: { type: 'string' } } },
            } } } },
          },
          responses: { 200: { description: 'Cube query result with generated SQL' } },
        },
      },
    },
  },
  apis: [],
}

const swaggerSpec = swaggerJsdoc(options)
export default swaggerSpec