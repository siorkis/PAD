// service_discovery
const zookeeper = require('node-zookeeper-client');
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
const port = 4001;

const client = zookeeper.createClient('localhost:2181');
client.connect();
const services = {};

async function isInstanceAlive(serviceInstance) {
  try {
    const url = `http://${serviceInstance.address}:${serviceInstance.port}/status`; // Replace with an endpoint that's always expected to be up
    await axios.get(url);
    return true;
  } catch (error) {
    return false;
  }
}

function registerService(serviceName, servicePort) {
  const baseServicePath = '/services';
  const servicePath = `${baseServicePath}/${serviceName}`;
  const instancePath = `${servicePath}/instance-${servicePort}`;
  const serviceData = JSON.stringify({ address: '127.0.0.1', port: servicePort });

  client.mkdirp(servicePath, (err) => {
    if (err && err.getCode() !== zookeeper.Exception.NODE_EXISTS) {
      throw err;
    }

    client.create(
      instancePath,
      Buffer.from(serviceData),
      zookeeper.CreateMode.EPHEMERAL,
      (err) => {
        if (err) throw new Error(err);
        console.log(`Registered ${serviceName} instance at ${instancePath} with data: ${serviceData}`);
      }
    );
  });
}

function unregisterService(serviceName) {
  const servicePath = `/services/${serviceName}`;

  client.exists(servicePath, (err, stat) => {
    if (err) throw new Error(err);

    if (stat) {
      client.remove(servicePath, (err) => {
        if (err) throw new Error(err);
        console.log(`Unregistered ${serviceName}`);
      });
    } else {
      console.log(`${serviceName} not found`);
    }
  });
}

process.on('SIGINT', () => {
  unregisterService('ordering_service');
  unregisterService('stock_service');

  client.close();
  process.exit();
});

function unregisterServiceInstance(serviceName, instancePort) {
  const servicePath = `/services/${serviceName}`;
  const instanceIdentifier = `instance-${instancePort}`; // Adjust this if your naming convention is different
  const instancePath = `${servicePath}/${instanceIdentifier}`;

  client.remove(instancePath, (err) => {
      if (err) {
          console.error(`Error removing instance ${instanceIdentifier}:`, err);
      } else {
          console.log(`Unregistered instance ${instanceIdentifier} of ${serviceName}`);
      }
  });
}

// service_discovery.js

async function getAliveInstancePort(serviceName) {
  const servicePath = `/services/${serviceName}`;

  try {
      const children = await new Promise((resolve, reject) => {
          client.getChildren(servicePath, (err, children) => {
              if (err) reject(err);
              else resolve(children);
          });
      });

      if (children.length === 0) {
          throw new Error('No services available for ' + serviceName);
      }

      for (const child of children) {
          const childPath = `${servicePath}/${child}`;
          const serviceData = await new Promise((resolve, reject) => {
              client.getData(childPath, (err, data) => {
                  if (err) reject(err);
                  else resolve(data);
              });
          });

          const serviceInstance = JSON.parse(serviceData.toString());
          if (await isInstanceAlive(serviceInstance)) {
              return serviceInstance.port; // Return the port of the alive instance
          }
      }

      throw new Error('No alive instances found for ' + serviceName);
  } catch (error) {
      console.error(`Error in getAliveInstancePort: ${error.message}`);
      throw error; // Rethrowing the error for the caller to handle
  }
}

// circuit breaker is friend of this guy  
function discoverService(serviceName, callback) {
  console.log("entered discoverService")
  const servicePath = `/services/${serviceName}`;

  client.getChildren(servicePath, (err, children, stats) => {
    if (err) {
        callback(err);
        return;
    }

    // If no services are available, return an error
    if (children.length === 0) {
        callback(new Error('No services available for ' + serviceName));
        return;
    }

    // If the service hasn't been called before, start from the first service
    if (!services[serviceName]) {
        services[serviceName] = 0;
    }

    // Get the service at the current index
    const serviceIndex = services[serviceName] % children.length;
    const childPath = `${servicePath}/${children[serviceIndex]}`;
    client.getData(childPath, (err, serviceData) => {
        if (err) {
            callback(err);
            return;
        }
        const service = JSON.parse(serviceData.toString());
        callback(null, { ServiceAddress: service.address, ServicePort: service.port });

        // Increment the index for the next call
        services[serviceName] = serviceIndex + 1;
    });
});
}


// circuit breaker is useless with this guy 

// function discoverService(serviceName, callback) {
//   console.log("entered discoverService")
//   const servicePath = `/services/${serviceName}`;

//   client.getChildren(servicePath, async (err, children) => {
//       if (err) {
//           callback(err);
//           return;
//       }

//       // If no services are available, return an error
//       if (children.length === 0) {
//           callback(new Error('No services available for ' + serviceName));
//           return;
//       }

//       // If the service hasn't been called before, start from the first service
//       if (!services[serviceName]) {
//           services[serviceName] = 0;
//       }

//       let attempts = 0;
//       while (attempts < children.length) {
//           const serviceIndex = (services[serviceName] + attempts) % children.length;
//           const childPath = `${servicePath}/${children[serviceIndex]}`;

//           try {
//               const serviceData = await new Promise((resolve, reject) => {
//                   client.getData(childPath, (err, data) => {
//                       if (err) reject(err);
//                       else resolve(data);
//                   });
//               });

//               const service = JSON.parse(serviceData.toString());
//               if (await isInstanceAlive(service)) {
//                   callback(null, { ServiceAddress: service.address, ServicePort: service.port });

//                   // Increment the index for the next call
//                   services[serviceName] = serviceIndex + 1;
//                   return;
//               }
//           } catch (error) {
//               console.log(`Error checking instance at ${childPath}: ${error.message}`);
//           }

//           attempts++;
//       }

//       // If all instances are down
//       callback(new Error('No alive instances found for ' + serviceName));
//   });
// }


app.get('/services/:name', (req, res) => {
  const serviceName = req.params.name;
  discoverService(serviceName, (err, data) => {
      if (err) {
          res.status(500).send(err.toString());
          return;
      }
      res.json(data);
  });
});

app.post('/register', (req, res) => {
  const { serviceName, servicePort } = req.body;
  if (!serviceName || !servicePort) {
    res.status(400).send('serviceName and servicePort are required');
    return;
  }

  registerService(serviceName, servicePort);
  res.json({ status: 'success' });
});

process.on('SIGINT', () => {
  client.close();
  process.exit();
});


app.get('/status', (req, res) => {
  res.json({ status: 'Service Discovery is Healthy' });
});

app.listen(port, () => {
  console.log(`Service Discovery running on http://localhost:${port}`);
});


module.exports = {
  discoverService: discoverService,
  unregisterServiceInstance: unregisterServiceInstance,
  getAliveInstancePort: getAliveInstancePort
};


const healthCheckInterval = setInterval(() => {
    console.log("Service discovery script is alive and monitoring services...");
}, 1000 * 60);

