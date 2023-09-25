# Laboratory work Nr.1

**Online grocery platform (ex: Amazon)**

## Assess Application Suitability

#### Scalability
Microservices allow you to scale individual components of your online grocery store independently based on demand. For example, during holiday seasons or special promotions, the order processing service can be scaled up without affecting other services.

#### Faster Development: 
Microservices enable faster development cycles as each component can be developed independently by different teams.

#### Improved Fault Isolation: 
Isolating different services means that if one service fails, it won't necessarily bring down the entire system. This leads to improved fault tolerance and better user experience.

#### Technological Diversity: 
Different services can use the most appropriate technology stack for their specific task, which can lead to improved performance and efficiency.

#### Continuous Deployment: 
Microservices facilitate continuous deployment and delivery, allowing you to release updates and features more frequently without disrupting the entire system.

#### Adaptability to Changing Requirements: 
Online grocery stores often face changing customer preferences and market trends.

#### Third-Party Integration:
Microservices make it easier to integrate with third-party services and APIs, such as payment gateways or mapping services, which is crucial for a seamless user experience.

## Define Service Boundaries
![image](https://github.com/siorkis/PAD/assets/10360165/88135c1f-c8b2-4ceb-a924-1d33d0a58f64)

#### Ordering Service
- Calculating the shipping price
- Building the bill 
- Sending a bill to the user
- Sending data to the Stock service
- Sending data to the Authentication service
- Saving/getting data from Ordering DB
- Getting data from Authentication DB

#### Stock Service
- Showing grocery catalog
- Updating stock
- Sending data to the Ordering service 
- Saving/getting data from Stock DB

#### Authentication Service
- User authentication
- Creating/Deleting user's credentials (ex: shipment address, card number)
- Credential encryption
- Sending data to the Ordering service
- Saving/getting data from Authentication DB

## Choose Technology Stack and Communication Patterns
- Gateway: JS
- Microservices & DB: - Python, Flask, PostgreSQL, Non-relational DB
- Communication: RESTful APIs


## Design Data Management

### Ordering Service

**/create_order**
> JSON 
```
request: { 
           "item" : "apple",
           "quantity" : 5,
           "user_id" : 123,
           "address" : "Florida, Ancr Str, bd 14",
           "card_number" : 1234123412341234
          }
```
> Response
> JSON

```
payload: { 
           "bill_id" : 1,
           "item" : "apple",
           "quantity" : 5,
           "user_id" : 123,
           "address" : "Florida, Ancr Str, bd 14",
           "card_number" : 1234123412341234,
           "status" : "sent"
          }
```
If the user is unauthorized:
> Response
> JSON
```
payload: { 
           "msg" : "Only authorized users can place orders",
           "status" : "denied"
          }
```

### Stock Service

**/show_stock GET**
> JSON 
```
request: {"show_stock" : True}
```
> Response
> JSON

```
payload: { 
           "apple": {
           "quantity" : 1000,
           "price" : 2
          },
          "banana": {
           "quantity" : 1000,
           "price" : 4
          },
          "potato": {
           "quantity" : 1000,
           "price" : 3.5
          },
          "tomato": {
           "quantity" : 1000,
           "price" : 2.8
          }
         }
```


### Authentication Service

**/login GET**
> JSON 
```
request: {
          "name" : "Alex",
          "password" : "hello"
         }
```
> Response
> JSON
```
payload: { "msg" : "Welcome"}
payload: { "msg" : "Wrong login or password"}
```

**/register GET**
> JSON 
```
request: {
          "name" : "Alex",
          "password" : "hello",
          "mail" : "ex@gmail.com"
         }
```
> Response
> JSON
```
payload: { "msg" : "Registration complete"}
```

**/is_regitred**
> JSON 
```
request: {
          "name" : "Alex",
          "password" : "hello",
          "user_id" : 123
         }
```
> Response
> JSON
```
payload: { "status" : True}
payload: { "status" : False}
```

## Set Up Deployment and Scaling

**Containerization with Docker:**

- Containerization of Microservices: Each microservice will have its Docker container. 
- Dockerfile: Dockerfiles for each microservice. This file contains instructions to build a Docker image, including the base image, dependencies installation, and application setup.
- Building Docker Images: Using the Dockerfile to build Docker images for each microservice. 

**Container Orchestration:**
- Kubernetes is a good choice for container orchestration. Kubernetes is a powerful tool for managing Docker containers in a production environment. It provides features like automated scaling, load balancing, and rolling updates.

OR

- Docker Compose (for Development): While Kubernetes is excellent for production, Docker Compose is useful for local development and testing. It allows you to define and run multi-container applications using a single YAML file.

**Deployment:**

Continuous Integration/Continuous Deployment (CI/CD): Implementation of a CI/CD pipeline to automate the deployment process. (Tools like Jenkins, GitLab CI/CD, or Travis CI)

**Scaling:**

- Horizontal Scaling: Microservices can be independently scaled horizontally to handle increased load. Kubernetes, for example, provides auto-scaling capabilities based on metrics like CPU utilization and incoming traffic.
- Load Balancing: Using load balancers to distribute traffic evenly among multiple instances of the same microservice. Kubernetes has built-in load-balancing features and also can be used with external load balancers like AWS Elastic Load Balancing or Nginx.

