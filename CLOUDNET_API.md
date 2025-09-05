# CloudNet REST API Integration

This CloudNet Panel is designed to work exclusively with the CloudNet REST API for real-time server and node management. **The panel requires CloudNet API connectivity to function.**

## ⚠️ Important Notice

**As of this version, all mock data has been removed. The panel will not function without a working CloudNet REST API connection.**

## Configuration

### Environment Variables

Set these environment variables to configure CloudNet API access:

```bash
# Required: Enable CloudNet API (must be 'true' for panel to work)
CLOUDNET_API_ENABLED=true

# Required: CloudNet REST API base URL
CLOUDNET_API_URL=http://localhost:8080/api/v3

# Required: Authentication credentials
CLOUDNET_API_USERNAME=your_username
CLOUDNET_API_PASSWORD=your_password

# Optional: API key if using token authentication instead
CLOUDNET_API_KEY=your_api_key

# Optional: Request timeout and retry settings
CLOUDNET_API_TIMEOUT=5000
CLOUDNET_API_RETRIES=3
CLOUDNET_API_RETRY_DELAY=1000

# Optional: CloudNet server configuration
CLOUDNET_SERVER_PATH=/home/cloudnet/CloudNet-Server
CLOUDNET_SERVER_PROXY_GROUP=Global-Proxy
```

### Connection Requirements

When `CLOUDNET_API_ENABLED=true`, the panel will:
- **Require** CloudNet API connectivity for login
- Fetch real server and node data from CloudNet REST API only
- Send server control commands (start/stop/restart) to CloudNet
- **Block access** if CloudNet API is unreachable
- Display a clear error page when CloudNet is not connected

### Error Handling

The panel includes robust error handling for CloudNet connectivity issues:

1. **API Disabled**: Shows configuration error when `CLOUDNET_API_ENABLED=false`
2. **Connection Refused**: Shows network connectivity errors
3. **Authentication Failures**: Shows credential validation errors
4. **Service Unavailable**: Shows when CloudNet server is down

## Supported Features

### Servers
- ✅ List all servers
- ✅ Get individual server details
- ✅ Start server (via lifecycle endpoint)
- ✅ Stop server (via lifecycle endpoint)
- ✅ Restart server (via lifecycle endpoint)
- ✅ Real-time logs via WebSocket
- ✅ Send commands to servers
- ✅ Automatic data transformation from CloudNet format
- ❌ Create/Update/Delete servers (not supported by CloudNet REST API)

### Nodes
- ✅ List all nodes
- ✅ Get individual node details
- ✅ Resource usage monitoring
- ✅ Status tracking
- ❌ Create/Update/Delete nodes (not supported by CloudNet REST API)

### Real-time Features
- ✅ Live server logs via WebSocket
- ✅ Server command execution
- ✅ Real-time server status updates
- ⚠️ All real-time features require CloudNet API connectivity

## CloudNet API Endpoints Used

The integration uses the following CloudNet REST API endpoints:

- `GET /service` - List all services/servers
- `GET /service/{id}` - Get individual service details
- `PATCH /service/{id}/lifecycle?target=start` - Start server
- `PATCH /service/{id}/lifecycle?target=stop` - Stop server
- `PATCH /service/{id}/lifecycle?target=restart` - Restart server
- `GET /service/{id}/logLines` - Get cached logs
- `GET /cluster` - List all cluster nodes
- `GET /cluster/{id}` - Get individual node details
- `POST /auth` - Authentication endpoint
- `POST /auth/refresh` - Token refresh endpoint

## Data Transformation

The panel automatically transforms CloudNet API responses to match the expected frontend format:

### Server Data Mapping
- `configuration.serviceId.uniqueId` → `id`
- `configuration.serviceId.taskName + taskServiceId` → `name`
- `lifeCycle` → `status` (RUNNING→online, STOPPED→offline, etc.)
- `properties["Online-Count"]` → `players`
- `properties["Max-Players"]` → `maxPlayers`
- `configuration.processConfig.maxHeapMemorySize` → `memory`
- `configuration.serviceId.nodeUniqueId` → `node`
- `address.host` → `ip`
- `address.port` → `port`
- `processSnapshot.cpuUsage` → `cpu`
- `processSnapshot.heapUsageMemory` → `ram`

### Node Data Mapping
- `uniqueId` → `id` and `name`
- `available` → `status` (true→online, false→offline)
- `nodeInfoSnapshot.processSnapshot.cpuUsage` → `cpu`
- `nodeInfoSnapshot.processSnapshot.heapUsageMemory` → `ram`
- `nodeInfoSnapshot.currentServicesCount` → `servers`

## Testing the Integration

### 1. Verify CloudNet API Health
```bash
curl http://localhost:5000/api/cloudnet/health
```

Expected responses:
- **Success**: `{"connected": true, "enabled": true, ...}`
- **API Disabled**: `{"connected": false, "enabled": false, "error": "CloudNet API is disabled in configuration"}`
- **Connection Failed**: `{"connected": false, "enabled": true, "error": "CloudNet API error: ..."}`

### 2. Test Login Blocking
Try to login when CloudNet is unavailable:
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  http://localhost:5000/api/auth/login
```

Expected response when CloudNet unavailable:
```json
{
  "error": "CloudNet API not available",
  "message": "...",
  "type": "cloudnet_unavailable"
}
```

## User Experience

### CloudNet Connected
When CloudNet API is accessible, users see the normal login page and can access all panel features.

### CloudNet Disconnected
When CloudNet API is not available, users see a dedicated error page with:
- Clear error message explaining the connection issue
- Helpful checklist of things to verify
- "Try Again" button to retry the connection
- Same visual branding as the login page

![CloudNet Error Page](https://github.com/user-attachments/assets/5f83fdaa-acdb-48a1-b615-d39f2641d54e)

## Troubleshooting

### Common Issues

1. **"CloudNet API is disabled in configuration"**
   - Set `CLOUDNET_API_ENABLED=true` in your environment

2. **"CloudNet API server is not running or not reachable"**
   - Verify CloudNet is running
   - Check the API URL and port
   - Ensure REST API module is loaded in CloudNet

3. **"Failed to authenticate with CloudNet API"**
   - Verify API credentials in environment variables
   - Check CloudNet REST API authentication configuration

4. **Panel shows error page instead of login**
   - This is expected behavior when CloudNet is not accessible
   - Fix CloudNet connectivity to access the panel

### Debug Mode
Enable debug logging by checking server console output when starting the panel. All CloudNet API errors are logged with detailed information.

## Migration from Mock Data

Previous versions of this panel included mock data fallbacks. **This has been completely removed.** If you were relying on mock data:

1. **Install and configure CloudNet**: The panel now requires a real CloudNet installation
2. **Enable CloudNet REST API**: Ensure the REST API module is loaded in CloudNet
3. **Configure credentials**: Set proper authentication in environment variables
4. **Test connectivity**: Use the health check endpoint to verify setup

## Future Enhancements

Potential future improvements:
- WebSocket integration for real-time updates
- Template management via CloudNet API
- User permission synchronization
- More detailed server metrics
- Node management operations