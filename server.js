const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Files = require('./File');
const port = 2000;
const app = express();
const socket = require('socket.io');
const cors = require('cors');
const server = require('http').Server(app);
const mqtt = require('mqtt')
var io = socket(server);
// var whitelist = ['https://api.xeus.dev', 'http://localhost:4200']

var option = {
    keepAlive: true,
    keepAliveInitialDelay: 300000,
    useNewUrlParser: true,
    auto_reconnect: true,
    useUnifiedTopology: true
}

app.use(cors());

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
    next();
  });
  
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

mongoose.connect('mongodb://127.0.0.1:27017/smart-factory', option, () => {
    console.log('connected to mongodb');
})

io.on('connection', function (socket) {
    Files.findOne({}, {}, { sort: { 'create': -1 } }, function (err, result) {
        if (result.length < 1 || err) {
            socket.emit('smartfactory', { success: true, msg: 'no_data' });
        } else {
            let count = 0;
            let faile_count = 0;
            // console.log(result.result[0].appliance)
            if (result.result[0].overallResult == 'Passed') {
                count = count + 1;
            }else{
                faile_count = 1
            }
            // console.log("have")
            socket.emit('smartfactory', { success: true, data: result, pass: count,fail: faile_count});
        }
    });

    socket.emit("hello",{success: true})
})

app.use(express.static('public'));

app.get('/mqtt', (req,res) => {
    var mqttoptions = {
        //port: mqtt_url.port,
        port: '1883',
        clientId: 'fabfe062-c7d4-4601-9289-8ca73b6f0bc8',
        //token
        username: 'o8y2VUoUPMjdKJDCRbiCgQynj8bKRAAm',
        // secret
        password: '_ev#*#wGiF(k*ICwl14(2bE@p@Ccp+T2',
    };
    var client  = mqtt.connect('tcp://broker.netpie.io',mqttoptions)

    client.on('connect', function (result,err) {
        client.subscribe('test03', function (err) {
            if (!err) {
              client.publish('test03', 'Hello mqtt')
              console.log("pass")
            }
          })
    })
    client.on('message', function (topic, message) {
        // message is Buffer
        res.status(200).send({message: message.toString()})
        console.log(message.toString())
        client.end()
      })
    
})

app.get('/data', (req, res) => {
    Files.find({}).exec((err, result) => {
        if (result.length < 1 || err) {
            res.status(200).send({ success: true, msg: 'no_data' });
        } else {
            let total = result.length
            let passtotal = 0
            let failtotal = 0
            for (i = 0; i < result.length; i++) {
                count = 0
                for (j = 0; j < result.length; j++) {
                    if (result[i].result[0].overallResult == 'Failed') {
                        count += 1
                    } else {
                        count = 0 // if not pass then fail
                        break;
                    }
                }
                if (count != 0) {
                    passtotal += 1;
                }else{
                    failtotal += 1;
                }
            }
            res.status(200).send({ success: true, data: result, total: total, passtotal: passtotal, failtotal: failtotal });
        }
    });
})

app.get('/latest', (req, res) => {
    Files.findOne({}, {}, { sort: { 'create': -1 } }, function (err, result) {
        if (result.length < 1 || err) {
            res.status(200).send({ success: true, msg: 'no_data' });
        } else {
            let count = 0;
            let fail = 0;
        
            for (i = 0; i < result.result.length; i++) {
                if (result.result[i]['@testState'] == 'Passed'){
                    count = count + 1;
                } else {
                    fail = fail+ 1;
                }
            }
            res.status(200).send({ success: true, data: result , pass: count, fail: fail});
        }
    });
})

app.get('/delete', (req, res) => {
    if (req.query.valid == 'abcdefgx') {
        Files.deleteMany({}, (err, result) => {
            if (result.length < 1 || err) {
                res.status(200).send({ success: true, msg: 'no_data' });
            } else {
                res.status(200).send({ success: true, data: result });
            }
        })
    } else {
        res.status(400).send({
            success: false,
            msg: 'bad_request',
            detial: 'no valid'
        })
    }
})

app.post('/data', (req, res) => {
    var request_data = req.body.result;
    var count = Object.keys(req.body).length
    if (count != 0) {
        if (request_data) {
            new Files({
                result: request_data,
                create: new Date()
            }).save().then(() => {
                Files.findOne({}, {}, { sort: { 'create': -1 } }, function (err, result) {
                    if (result.length < 1 || err) {
                        socket.emit('smartfactory', { success: true, msg: 'no_data' });
                    } else {
                        let count = 0;
                        let faile_count = 0;
                        // console.log(result.result[0].appliance)
                        if (result.result[0].overallResult == 'Passed') {
                            count = count + 1;
                        }else{
                            faile_count = 1
                        }
                        // console.log("have")
                        io.sockets.emit('smartfactory', { success: true, data: result, pass: count,fail: faile_count});
                    }
                });
                res.status(200).send({
                    success: true,
                    msg: {
                        result: request_data
                    }
                });
            }).catch(err => {
                res.status(400).send({
                    success: false,
                    msg: 'bad_request',
                    detial: err
                })
            });
        } else {
            res.status(400).send({
                success: false,
                msg: 'bad_request',
                detial: 'result key not found'
            })
        }

    } else {
        res.status(400).send({
            success: false,
            msg: 'bad_request',
            detial: 'no body or type not support'
        })
    }
})

server.listen(port, () => {
    console.log(`Service Start on port ${port}`)
})