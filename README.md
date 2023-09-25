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
![pad_diagram](https://github.com/siorkis/PAD/assets/10360165/d521aabd-3479-4713-ae22-da5cbb4d2751)

#### Ordering Service
- Calculating the shipping price
- Building the bill 
- Sending a bill to the user
- Sending data to the Stock service
- Saving/getting data from Ordering DB

#### Stock Service
- Showing grocery catalog
- Updating stock
- Sending data to the Ordering service 
- Saving/getting data from Stock DB

#### Authentication Service
- User authentication
- Creating/Deleting user's credentials (ex: shipment address, card number)
- Sending data to the Ordering service
- Saving/getting data from Authentication DB

## Choose Technology Stack and Communication Patterns
- Gateway: JS
- Microservices & DB: - Python, Flask, PostgreSQL, Non-relational DB
- Communication: RESTful APIs


## Design Data Management

### Ordering Service

**/create_order GET**
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
## Set Up Deployment and Scaling
