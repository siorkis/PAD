const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');

const { discoverService } = require('./service_discovery');

const app = express();
const PORT = 4000;

// Microservices URLs
const STOCK_SERVICE_URL = 'http://localhost:5000';
const ORDERING_SERVICE_URL = 'http://localhost:5001';
const cache = new NodeCache({ stdTTL: 60 });  // TTL in seconds, here set to 1 minute

function acceptOnlyJSON(req, res, next) {
  const contentType = req.headers['content-type'];
  
  if (!contentType || contentType.toLowerCase() !== 'application/json') {
      return res.status(415).send({ error: 'Server only accepts application/json content-type.' });
  }

  next();
}

// Middleware for caching
function cacheMiddleware(req, res, next) {
  const key = req.path + JSON.stringify(req.body);  // Construct a cache key
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
      console.log('Serving from cache:', key);  // Log cache hit
      const cacheStats = cache.getStats();
      console.log('Cache Statistics:', cacheStats);
      return res.send(cachedResponse);
  }

  // If not in cache, proceed to request handling
  console.log('Fetching and storing in cache:', key);  // Log cache miss/fetch
  const cacheStats = cache.getStats();
  console.log('Cache Statistics:', cacheStats);

  next();
}

app.use(express.json());  // for parsing application/json

// Routes for stock_service
app.use('/stock', acceptOnlyJSON, cacheMiddleware, (req, res) => {
    console.log("Entered /stock route");
    discoverService('stock_service', async (err, service) => {
        if (err) {
            console.error(`Failed to discover stock_service: ${err.message}`);
            return res.status(503).send('Service Unavailable');
        }

        try {
            const serviceURL = `http://${service.ServiceAddress}:${service.ServicePort}${req.path}`;
            console.log("Forwarding to:", serviceURL);
            const response = await axios({
                method: req.method,
                url: serviceURL,
                data: req.body
            });

            const key = req.path + JSON.stringify(req.body);
            cache.set(key, response.data);

            res.status(response.status).send(response.data);
        } catch (error) {
            res.status(error.response?.status || 500).send(error.response?.data || {});
        }
    });
});

// Routes for ordering_service
app.use('/order', acceptOnlyJSON, cacheMiddleware, (req, res) => {
    console.log("Entered /order route");
    discoverService('ordering_service', async (err, service) => {
        if (err) {
            console.error(`Failed to discover order_service: ${err.message}`);
            return res.status(503).send('Service Unavailable');
        }

        try {
            const serviceURL = `http://${service.ServiceAddress}:${service.ServicePort}${req.path}`;
            const response = await axios({
                method: req.method,
                url: serviceURL,
                data: req.body
            });

            const key = req.path + JSON.stringify(req.body);
            cache.set(key, response.data);

            res.status(response.status).send(response.data);
        } catch (error) {
            res.status(error.response?.status || 500).send(error.response?.data || {});
        }
    });
});

app.listen(PORT, () => {
    console.log(`API Gateway running on http://localhost:${PORT}`);
});

app.get('/status', (req, res) => {
    res.json({ status: 'Gateway is Healthy' });
});

// on Windows:
// first run zkServer.sh start from cmd ../zookeeper/bin/
// netstat -an | grep 2181 - run from bash ../zookeeper/bin/
// expected output (zk started):
// TCP    0.0.0.0:2181           0.0.0.0:0              LISTENING
// TCP    [::]:2181              [::]:0                 LISTENING
// in order to terminate zk - zkServer.sh stop from cmd ../zookeeper/bin/
