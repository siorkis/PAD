// gateway.js
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');

const { discoverService } = require('./service_discovery');

const app = express();
const PORT = 4000;

// class CircuitBreaker {
//     constructor(options) {
//       this.failureThreshold = options.failureThreshold || 3;
//       this.resetTimeout = options.resetTimeout || 10000; // 10 seconds
//       this.failureCount = 0;
//       this.lastFailureTime = null;
//       this.state = 'CLOSED';
//     }
  
//     async call(fn, ...args) {
//       if (this.state === 'OPEN') {
//         if (Date.now() - this.lastFailureTime > this.resetTimeout) {
//           this.state = 'HALF-OPEN';
//         } else {
//           throw new Error('Circuit Breaker is open');
//         }
//       }
  
//       try {
//         const result = await fn(...args);
//         if (this.state === 'HALF-OPEN') {
//           this.state = 'CLOSED';
//           this.failureCount = 0;
//         }
//         return result;
//       } catch (error) {
//         this.failureCount += 1;
//         this.lastFailureTime = Date.now();
  
//         if (this.failureCount >= this.failureThreshold) {
//           this.state = 'OPEN';
//           console.log('Circuit Breaker tripped');
//         }
  
//         throw error;
//       }
//     }
//   }

// const circuitBreaker = new CircuitBreaker({
//     failureThreshold: 3,
//     resetTimeout: 3500, // 3.5 * 1000
// });

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
  // Check if request method is GET
  if (req.method !== 'GET') {
    return next();
  }

  const key = req.path;  // Construct a cache key based only on path since GET requests don't have a body
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


app.use(express.json()); 
const roundRobinCounters = {};

// Routes for stock_service
app.use('/stock', acceptOnlyJSON, cacheMiddleware, (req, res) => {
    console.log("Entered /stock route");
    discoverService('stock_service', async (err, service) => {
        if (err) {
            console.error(`Failed to discover stock_service: ${err.message}`);
            return res.status(503).send('Service Unavailable');
        }

        try {
            // const service_call = await circuitBreaker.call(discoverService, 'stock_service');
            const serviceURL = `http://${service.ServiceAddress}:${service.ServicePort}${req.path}`;
            console.log("Forwarding to:", serviceURL);
            const response = await axios({
                method: req.method,
                url: serviceURL,
                data: req.body
            });

            // Cache the response if it's a GET request
            if (req.method === 'GET') {
                const key = req.path;
                cache.set(key, response.data);
            }

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
            // const service_call = await circuitBreaker.call(service, 'ordering_service');
            const serviceURL = `http://${service.ServiceAddress}:${service.ServicePort}${req.path}`;
            const response = await axios({
                method: req.method,
                url: serviceURL,
                data: req.body
            });

            // Cache the response if it's a GET request
            if (req.method === 'GET') {
                const key = req.path;
                cache.set(key, response.data);
            }

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
// first run from cmd ../zookeeper/bin/                                 | zkServer.sh start
// run from bash                                                        | netstat -an | grep 2181
// expected output (zk started):
// TCP    0.0.0.0:2181           0.0.0.0:0              LISTENING
// TCP    [::]:2181              [::]:0                 LISTENING
// in order to terminate zk from cmd ../zookeeper/bin/                  | zkServer.sh stop
