const zookeeper = require('node-zookeeper-client');
const express = require('express');

const app = express();
app.use(express.json());
const port = 4001;

const client = zookeeper.createClient('localhost:2181');
client.connect();

function registerService(serviceName, servicePort) {
  const baseServicePath = '/services';
  const servicePath = `${baseServicePath}/${serviceName}`;
  const serviceData = JSON.stringify({ address: '127.0.0.1', port: servicePort });

  client.mkdirp(baseServicePath, (err) => {
    if (err && err.getCode() !== zookeeper.Exception.NODE_EXISTS) {
      throw err;
    }

    client.exists(servicePath, (err, stat) => {
      if (err) throw new Error(err);

      if (stat) {
        console.log(`${serviceName} already registered. Updating data...`);
        client.setData(
          servicePath,
          Buffer.from(serviceData),
          (err) => {
            if (err) throw new Error(err);
            console.log(`Updated ${serviceName} with data: ${serviceData}`);
          }
        );
      } else {
        client.create(
          servicePath,
          Buffer.from(serviceData),
          zookeeper.CreateMode.EPHEMERAL,
          (err) => {
            if (err) throw new Error(err);
            console.log(`Registered ${serviceName} with data: ${serviceData}`);
          }
        );
      }
    });
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

function discoverService(serviceName, callback) {
  console.log("entered discoverService")
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
  discoverService: discoverService
};


const healthCheckInterval = setInterval(() => {
    console.log("Service discovery script is alive and monitoring services...");
}, 1000 * 60);

