const Consul = require('consul');
const express = require('express');

const app = express();
const port = 4001;
const consul = new Consul({
  host: 'localhost',
  port: 8500
});

// Service Registration
function registerService(serviceName, servicePort) {
    const serviceId = `${serviceName}_1`;  // Ensure unique ID per instance

    consul.agent.service.register({
        id: serviceId,
        name: serviceName,
        tags: ['serviceName'],
        address: '127.0.0.1',
        port: servicePort,
        check: {
            http: `http://127.0.0.1:${servicePort}/status`,  // Assuming you have a status endpoint for health checks
            interval: '10s'
        }
    }, err => {
        if (err) throw new Error(err);
        console.log(`Registered ${serviceName} with ID: ${serviceId}`);
    });
}

// Service Discovery
// function discoverService(serviceName, callback) {
//     console.log(`Attempting to discover ${serviceName}`);

//     consul.catalog.service.nodes(serviceName, (err, result) => {
//         console.log(`Response from Consul:`, result);
//         console.log(`${serviceName} discovered`)
//         if (err) {
//             console.log(`Error while discovering ${serviceName}`);
//             console.error(`Error while discovering ${serviceName}:`, err);
//             return callback(err);
//         }
//         if (result.length === 0) {
//           console.log(`${serviceName} not found.`);
//           console.error(`${serviceName} not found.`);
//           return callback(new Error('Service not found'));
//         }
        
//         console.log(`Discovered service ${serviceName}:`, result[0]);
//         // For simplicity, we're taking the first instance of the service
//         callback(null, result[0]);
//     });
// }

function discoverService(serviceName, callback) {
  console.log(`Attempting to discover ${serviceName} (debug mode)`);
  
  switch(serviceName) {
    case 'stock_service':
      callback(null, { ServiceAddress: 'localhost', ServicePort: 5000 });
      break;
      
    case 'ordering_service':
      callback(null, { ServiceAddress: 'localhost', ServicePort: 5001 });
      break;
      
    default:
      callback(new Error(`Unknown service: ${serviceName}`));
  }
}



// Service Deregistration
function deregisterService(serviceId, callback) {
    consul.agent.service.deregister(serviceId, err => {
        if (err) return callback(err);
        console.log(`Deregistered service with ID: ${serviceId}`);
    });
}


registerService('stock_service', 5000);
console.log("Registering stock_service...");


registerService('ordering_service', 5001);
console.log("Registering ordering_service...");

const interval = setInterval(() => {
  // This is a no-op, just keeping the process alive
  console.log("Service discovery script is alive and monitoring services...");
}, 1000 * 60 * 60); // Every hour

// setInterval(() => {
//   discoverService('stock_service', (err, service) => {
//       if (err) {
//           console.error(`Failed to discover stock_service: ${err.message}`);
//       } else {
//           console.log('Discovered stock_service:', service);
//       }
//   });

//   discoverService('ordering_service', (err, service) => {
//       if (err) {
//           console.error(`Failed to discover ordering_service: ${err.message}`);
//       } else {
//           console.log('Discovered ordering_service:', service);
//       }
//   });
// }, 1000 * 60); // Every minute for demonstration purposes

const healthCheckInterval = setInterval(() => {
  console.log("Service discovery script is alive and monitoring services...");
}, 1000 * 60);

process.on('SIGINT', () => {
  clearInterval(interval); // Clear the interval on exit
  deregisterService('stock_service_1', err => {
      if (err) console.error('Failed to deregister stock_service:', err);
  });
  deregisterService('ordering_service_1', err => {
      if (err) console.error('Failed to deregister ordering_service:', err);
  });
  process.exit();
});

app.get('/status', (req, res) => {
  res.json({ status: 'Service Discovery is Healthy' });
});

app.listen(port, () => {
  console.log(`Service Discovery running on http://localhost:${port}`);
});


module.exports = {
  discoverService: discoverService
};

// 1. run the program
// 2. run from cmd `consul agent -dev`
