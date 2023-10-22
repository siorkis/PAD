const zookeeper = require('node-zookeeper-client');

const client = zookeeper.createClient('localhost:2181');
client.connect();

client.getChildren('/services', (err, children) => {
    if (err) {
        console.log(err.stack);
        return;
    }

    console.log('Services:', children);

    if (children.includes('order_service')) {
        client.getData('/services/order_service', (err, data) => {
            if (err) {
                console.log(err.stack);
                return;
            }

            console.log('order_service data:', data.toString('utf8'));
        });
    }
});