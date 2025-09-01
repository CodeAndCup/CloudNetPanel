# CloudNet REST API Integration

This CloudNet Panel now supports integration with the CloudNet REST API for real-time server and node management.

## Configuration

### Environment Variables

Copy the `server/.env.example` file to `server/.env` and configure the following variables:

```bash
# Enable/disable CloudNet API integration
CLOUDNET_API_ENABLED=true

# CloudNet REST API base URL (usually port 8080)
CLOUDNET_API_URL=http://localhost:8080/api/v3

# Authentication (if required by your CloudNet instance)
CLOUDNET_API_KEY=your_api_key_here
# OR
CLOUDNET_API_USERNAME=your_username
CLOUDNET_API_PASSWORD=your_password

# Request settings
CLOUDNET_API_TIMEOUT=5000
CLOUDNET_API_RETRIES=3
CLOUDNET_API_RETRY_DELAY=1000
```

### Default Mode

By default, the panel operates in **mock mode** (`CLOUDNET_API_ENABLED=false`) which uses static test data. This allows you to:
- Test the interface without a CloudNet instance
- Develop and experiment safely
- Demo the panel functionality

### CloudNet API Mode

When `CLOUDNET_API_ENABLED=true`, the panel will:
- Fetch real server and node data from CloudNet REST API
- Send server control commands (start/stop/restart) to CloudNet
- Automatically fall back to mock data if the API is unreachable

## Supported Features

### Servers
- ✅ List all servers
- ✅ Get individual server details
- ✅ Start server (via lifecycle endpoint)
- ✅ Stop server (via lifecycle endpoint)
- ✅ Restart server (via lifecycle endpoint)
- ✅ Automatic data transformation from CloudNet format
- ✅ Fallback to mock data on API errors
- ❌ Create/Update/Delete servers (not supported by CloudNet REST API)

### Nodes
- ✅ List all nodes
- ✅ Get individual node details
- ✅ Resource usage monitoring
- ✅ Status tracking
- ✅ Fallback to mock data on API errors
- ❌ Create/Update/Delete nodes (not supported by CloudNet REST API)

## CloudNet API Endpoints Used

The panel integrates with the following CloudNet REST API endpoints:

### Services (Servers)
- `GET /api/v3/service` - List all services (returns `{ services: [] }`)
- `GET /api/v3/service/{identifier}` - Get service details  
- `PATCH /api/v3/service/{identifier}/lifecycle?target=start` - Start service
- `PATCH /api/v3/service/{identifier}/lifecycle?target=stop` - Stop service
- `PATCH /api/v3/service/{identifier}/lifecycle?target=restart` - Restart service

### Cluster Nodes
- `GET /api/v3/cluster` - List all cluster nodes (returns `{ nodes: [] }`)
- `GET /api/v3/cluster/{uniqueId}` - Get node details

## Data Transformation

The panel automatically transforms CloudNet API responses to match the expected frontend format:

### Server Data Mapping
```javascript
CloudNet Service → Panel Server
├── serviceId.name → name
├── configuration.groups[0] → type
├── lifeCycle → status (RUNNING→online, STOPPED→offline, etc.)
├── properties.onlineCount → players
├── properties.maxPlayers → maxPlayers
├── configuration.maxHeapMemorySize → memory
├── serviceId.nodeUniqueId → node
├── address.host → ip
├── address.port → port
└── processSnapshot.heapUsageMemory → ram
```

### Node Data Mapping
```javascript
CloudNet Node → Panel Node
├── uniqueId/name → id/name
├── available → status (true→online, false→offline)
├── info.listeners[0].host → ip
├── processSnapshot.cpuUsage → cpu
├── processSnapshot.heapUsageMemory → ram
└── configuration.maxServiceCount → maxServers
```

## Error Handling

The integration includes robust error handling:

1. **Connection Errors**: Automatic retry with exponential backoff
2. **Authentication Errors**: Clear error logging and fallback
3. **API Unavailable**: Graceful fallback to mock data
4. **Malformed Responses**: Safe data transformation with defaults

## Testing the Integration

### 1. Mock Mode (Default)
```bash
# In server/.env
CLOUDNET_API_ENABLED=false
```
Start the panel normally - it will use mock data for development/testing.

### 2. CloudNet API Mode
```bash
# In server/.env
CLOUDNET_API_ENABLED=true
CLOUDNET_API_URL=http://your-cloudnet-host:8080/api/v3
```

Ensure your CloudNet instance has:
- REST API module enabled
- Correct port configuration (default: 8080)
- Proper authentication configured (if required)

### 3. Testing Fallback
Start the panel with CloudNet API enabled but without a running CloudNet instance. The panel will:
1. Attempt to connect to CloudNet API
2. Log connection errors
3. Automatically fall back to mock data
4. Continue functioning normally

## Troubleshooting

### Common Issues

1. **"CloudNet API is not enabled"**
   - Set `CLOUDNET_API_ENABLED=true` in your environment

2. **Connection refused errors**
   - Verify CloudNet is running
   - Check the API URL and port
   - Ensure REST API module is loaded in CloudNet

3. **Authentication failures**
   - Verify API credentials
   - Check CloudNet REST API configuration

4. **Slow responses**
   - Increase `CLOUDNET_API_TIMEOUT`
   - Check network connectivity
   - Verify CloudNet server performance

### Debug Mode
Enable debug logging by checking server console output when starting the panel. All CloudNet API errors are logged with detailed information.

## Future Enhancements

Potential future improvements:
- WebSocket integration for real-time updates
- Template management via CloudNet API
- User permission synchronization
- More detailed server metrics
- Node management operations