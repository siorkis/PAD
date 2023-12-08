// gateway.js
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');


class CircuitBreaker {
    constructor(failureThreshold, resetTimeout) {
        this.failureThreshold = failureThreshold;
        this.resetTimeout = resetTimeout;
        this.failures = 0;
        this.lastFailureTime = null;
        this.state = 'CLOSED';
    }

    recordFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
            console.log('Circuit Breaker tripped!');
        }
    }

    canRequest() {
        if (this.state === 'OPEN') {
            const now = Date.now();
            if (now - this.lastFailureTime > this.resetTimeout) {
                this.state = 'HALF-OPEN';
                this.failures = 0;
                return true;
            }
            return false;
        }
        return true;
    }
}

const { discoverService } = require('./service_discovery');
const { unregisterServiceInstance } = require('./service_discovery');
const { getAliveInstancePort } = require('./service_discovery');

const app = express();
const PORT = 4000;

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
  if (req.method !== 'GET' && !req.path.endsWith('/status')) {
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
  }

  next();
}


app.use(express.json()); 
const roundRobinCounters = {};
const circuitBreaker = new CircuitBreaker(3, 10000);
// Routes for stock_service
app.use('/stock', acceptOnlyJSON, cacheMiddleware, (req, res) => {
    console.log("Entered /stock route");
    discoverService('stock_service', async (err, service) => {

        if (!circuitBreaker.canRequest()) {
            return res.status(503).send('Service unavailable');
        }

        try {
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
            if (error.message.includes('No services available for')) {
                // Handle the situation when no instances are available
                return res.status(503).send('Service unavailable. No instances of stock_service are currently available.');
            }
            circuitBreaker.recordFailure();
            
            // comment 
            const redirectPort = await getAliveInstancePort('stock_service');
            console.log("redirectPort ", redirectPort)
            const serviceURL = `http://${service.ServiceAddress}:${redirectPort}${req.path}`;
            console.log("Redirect to:", serviceURL);
            const response = await axios({
            method: req.method,
            url: serviceURL,
            data: req.body
            });
            res.status(response.status).send(response.data);

            if (circuitBreaker.state == "OPEN") {
                unregisterServiceInstance("stock_service", service.ServicePort)
                circuitBreaker.state = 'HALF-OPEN'
            }
            // comment 

        }
    });
});

// Routes for ordering_service
app.use('/order', acceptOnlyJSON, cacheMiddleware, (req, res) => {
    console.log("Entered /order route");
    discoverService('ordering_service', async (err, service) => {

        if (!circuitBreaker.canRequest()) {
            return res.status(503).send('Service unavailable');
        }

        try {
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
            circuitBreaker.recordFailure();
            
            // comment 
            const redirectPort = await getAliveInstancePort('ordering_service');
            console.log("redirectPort ", redirectPort)
            const serviceURL = `http://${service.ServiceAddress}:${redirectPort}${req.path}`;
            console.log("Redirect to:", serviceURL);
            const response = await axios({
            method: req.method,
            url: serviceURL,
            data: req.body
            });
            res.status(response.status).send(response.data);

            if (circuitBreaker.state == "OPEN") {
                unregisterServiceInstance("ordering_service", service.ServicePort)
                circuitBreaker.state = 'HALF-OPEN'
            }
            // comment 

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
