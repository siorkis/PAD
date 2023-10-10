const zookeeper = require('node-zookeeper-client');
const express = require('express');

const app = express();
const port = 4001;

const client = zookeeper.createClient('localhost:2181');
client.connect();

// Service Registration
function registerService(serviceName, servicePort) {
  const baseServicePath = `/services`;
  const servicePath = `${baseServicePath}/${serviceName}`;
  const serviceData = JSON.stringify({ address: '127.0.0.1', port: servicePort });

  client.mkdirp(baseServicePath, (err) => {
    if (err && err.getCode() !== zookeeper.Exception.NODE_EXISTS) {
      throw err;
    }

    client.create(servicePath, Buffer.from(serviceData), zookeeper.CreateMode.EPHEMERAL, (err) => {
      if (err) throw new Error(err);
      console.log(`Registered ${serviceName} with data: ${serviceData}`);
    });
  });
}

function discoverService(serviceName, callback) {
  const servicePath = `/services/${serviceName}`;
  client.getData(servicePath, (err, serviceData) => {
      if (err) {
          callback(err);
          return;
      }
      const service = JSON.parse(serviceData.toString());
      callback(null, { ServiceAddress: service.address, ServicePort: service.port });
  });
}


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
  discoverService: discoverService
};


registerService('stock_service', 5000);
console.log("Registering stock_service...");

registerService('ordering_service', 5001);
console.log("Registering ordering_service...");

const healthCheckInterval = setInterval(() => {
    console.log("Service discovery script is alive and monitoring services...");
}, 1000 * 60);

