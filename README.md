# Dynatrace Traceroute App

A custom Dynatrace application that demonstrates the capabilities of the Dynatrace App Toolkit, including custom workflow actions, scheduled execution, log ingestion, and geolocation visualization.

**This application is for demonstration and educational purposes only. Not intended for commercial use.**

## Inspiration

This project was inspired by the [VisualTraceroute](https://github.com/K-rangeR/VisualTraceroute) project by K-rangeR, adapted to showcase the capabilities of the Dynatrace platform including custom apps, workflow actions, and observability features.

## Overview

This app showcases what's possible with Dynatrace custom applications by providing network path tracing capabilities with visual mapping and automated workflow integration. It demonstrates:

- Custom Dynatrace Apps with React UI
- Custom Workflow Actions
- Schedule-based automation
- Log ingestion and querying
- Geolocation data visualization
- Integration with Dynatrace Workflows

## Features

- **Schedule Management**: Create and manage traceroute schedules with configurable intervals
- **Workflow Integration**: Automatically create Dynatrace workflows from schedules
- **Visual Mapping**: Interactive map showing geographic path of network hops
- **Detailed Hop Information**: Table view with latency, location, and IP information
- **Log Ingestion**: Automatic ingestion of traceroute results into Dynatrace logs
- **Public/Private IP Detection**: Identifies and highlights public vs private IP addresses

## Screenshots

### Main Dashboard
[Add screenshot of the main app view showing the schedule list]

### Schedule Creation
[Add screenshot of the form for creating a new traceroute schedule]

### Traceroute Map View
[Add screenshot of the interactive map showing traceroute hops with geographic locations]

### Traceroute Table View
[Add screenshot of the detailed table showing hop-by-hop information]

### Workflow Integration
[Add screenshot of the "Create Workflow" button and the resulting workflow in Dynatrace]

### Workflow Action Widget
[Add screenshot of the custom workflow action widget showing the schedule dropdown]

## APIs and Services Used

### Dynatrace APIs

- **@dynatrace-sdk/app-environment**: App state management for storing schedules
- **@dynatrace-sdk/client-classic-environment-v2**: Log ingestion via `logsClient.storeLog()`
- **@dynatrace-sdk/navigation**: Workflow intent system for programmatic workflow creation
- **@dynatrace/strato-components-preview**: UI components (DataTable, Container, Flex, etc.)

### External APIs

- **ip2location.io**: Primary geolocation data provider for IP addresses
  - Endpoint: `https://api.ip2location.io/?ip={ip}`
  - Provides: City, country, latitude, longitude, ISP information
  - Rate limits: 1000 free queries per day
  - Documentation: https://www.ip2location.io/

- **ip-api.com**: Fallback geolocation provider
  - Endpoint: `http://ip-api.com/json/{ip}`
  - Provides: City, country, latitude, longitude, ISP information
  - Rate limits: 45 requests per minute for free tier
  - Documentation: https://ip-api.com/docs/api:json

- **ipwhois.app**: Secondary fallback geolocation provider
  - Endpoint: `https://ipwhois.app/json/{ip}`
  - Provides: Geographic and ISP information for IP addresses
  - Documentation: https://ipwhois.io/documentation

## Architecture

### Components

1. **UI Application** (`ui/app/`):
   - `App.tsx`: Main application component
   - `ScheduleManager.tsx`: Schedule CRUD operations and workflow creation
   - `TracerouteForm.tsx`: Schedule creation form
   - `TracerouteMap.tsx`: Interactive Leaflet map for visualization
   - `TracerouteTable.tsx`: Detailed hop information display

2. **Workflow Action** (`actions/runTraceroute.action.ts`):
   - Executes traceroute based on schedule configuration
   - Retrieves geolocation data for each hop
   - Ingests logs into Dynatrace with structured attributes
   - Returns results for workflow processing

3. **Action Widget** (`actions/runTraceroute.action-widget.tsx`):
   - Custom widget for workflow action configuration
   - Dropdown selector for choosing schedules
   - Displays in Dynatrace Workflows UI

### Data Flow

1. User creates a schedule in the app UI
2. Schedule stored in App State Service
3. User clicks "Create Workflow" to generate automated execution
4. Workflow executes the custom action at specified intervals
5. Action performs traceroute and retrieves geolocation data
6. Results ingested as logs with unique identifiers
7. Logs queryable via DQL with structured attributes

## Deployment

### Prerequisites

- Dynatrace environment (SaaS or Managed)
- Dynatrace App Toolkit installed: `npm install -g @dynatrace/dt-app`
- Node.js 18 or higher
- Valid Dynatrace API token with app deployment permissions

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/dynatrace-traceroute-app.git
   cd dynatrace-traceroute-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Dynatrace environment**:
   ```bash
   dt-app configure
   ```
   Provide your Dynatrace environment URL and API token when prompted. This will populate the `environmentUrl` field in `app.config.json`.

4. **Deploy the app**:
   ```bash
   npm run deploy
   ```

5. **Access the app**:
   Navigate to your Dynatrace environment and find the app in the Apps menu.

### Development

Run the app locally in development mode:

```bash
npm run start
```

This starts a local development server with hot reload enabled.

## Log Query Examples

After workflow executions, you can query the ingested logs using DQL:

```dql
// All traceroute logs
fetch logs
| filter log.source == "traceroute-app"

// Specific execution
fetch logs
| filter log.source == "traceroute-app"
| filter execution.id == "traceroute-{scheduleId}-{timestamp}"

// Specific schedule
fetch logs
| filter log.source == "traceroute-app"
| filter schedule.id == "{scheduleId}"

// High latency hops
fetch logs
| filter log.source == "traceroute-app"
| filter traceroute.rtt.avg > 100
| fields timestamp, traceroute.target, traceroute.hop, traceroute.ip, traceroute.rtt.avg

// Geographic distribution
fetch logs
| filter log.source == "traceroute-app"
| summarize count(), by: {geo.country}
```

### Log Attributes

Each log record includes the following attributes:

- `log.source`: Always "traceroute-app"
- `app.name`: Always "traceroute"
- `execution.id`: Unique identifier for each execution
- `schedule.id`: Schedule identifier
- `schedule.name`: Schedule name
- `traceroute.target`: Target IP or hostname
- `traceroute.hop`: Hop number
- `traceroute.ip`: IP address of the hop
- `traceroute.hostname`: Hostname (if available)
- `traceroute.rtt.min`: Minimum round-trip time
- `traceroute.rtt.max`: Maximum round-trip time
- `traceroute.rtt.avg`: Average round-trip time
- `traceroute.is_public`: Boolean indicating public IP
- `geo.city`: City location
- `geo.country`: Country location
- `geo.latitude`: Latitude coordinate
- `geo.longitude`: Longitude coordinate

## Configuration

### Schedule Settings

- **Name**: Descriptive name for the schedule
- **Target**: IP address or hostname to trace
- **Interval**: Execution frequency in minutes (minimum 5 minutes recommended)

### Workflow Settings

When creating a workflow from a schedule, the app automatically configures:

- Workflow title: "Traceroute: {schedule name}"
- Trigger: Interval-based (matches schedule interval)
- Task: Custom action with schedule ID parameter
- Timezone: UTC

## Limitations

- Traceroute execution depends on network permissions
- Geolocation data accuracy varies by IP address
- ip-api.com rate limits apply (45 requests/minute free tier)
- Private IPs (RFC1918) cannot be geolocated
- Maximum hop count typically limited to 30

## Technical Notes

### Why This Architecture?

- **App State Service**: Persistent storage for schedules without external database
- **Custom Actions**: Enables workflow integration and scheduled execution
- **Log Ingestion**: Leverages Dynatrace's powerful log analytics and querying
- **Dot-notation Attributes**: Optimized for DQL querying and filtering
- **Intent System**: Proper Dynatrace navigation pattern for workflow creation

### Error Handling

- Log ingestion failures don't cause action failure (wrapped in try-catch)
- Geolocation failures don't stop traceroute execution
- Invalid schedules return clear error messages
- Network timeouts handled gracefully

## License

This project is provided under a non-commercial license. See LICENSE file for details.

This is a demonstration project showcasing Dynatrace custom app capabilities. Not intended for production use or commercial purposes.

## Resources

- [Dynatrace App Toolkit Documentation](https://developer.dynatrace.com/develop/app-toolkit/)
- [Dynatrace Workflow Actions](https://developer.dynatrace.com/develop/workflows/)
- [Dynatrace App SDK](https://developer.dynatrace.com/develop/sdks/)
- [ip-api.com Documentation](https://ip-api.com/docs/)

## Contributing

This is a demonstration project. Feel free to fork and modify for your own learning purposes.

## Support

This is an unofficial demonstration project. For Dynatrace platform support, please refer to official Dynatrace channels.
