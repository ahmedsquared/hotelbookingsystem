var { MongoClient } = require("mongodb");
var bcrypt = require('bcrypt');

var db = null;
async function connect(){
    if(db == null){
        var url = 'mongodb+srv://dbUser:Wf81kH5ELPmpAo1u@cluster0.gnrno.mongodb.net/cps888?retryWrites=true&w=majority';
        var options = {
            useUnifiedTopology: true,
        };

        var connection = await MongoClient.connect(url, options);
        db = await connection.db("cps888");
    }
    
    return db;
}

async function register(username, password){
    var conn = await connect();
    var existingUser = await conn.collection('customers').findOne({username});

    if (existingUser != null){
        throw new Error('User already exists!')
    }

    var SALT_ROUNDS = 10;
    var passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await conn.collection('customers').insertOne({username, passwordHash});
}

async function login(username, password){
    var conn = await connect();
    var user = await conn.collection('customers').findOne({username});

    if (user == null){
        throw new Error('User does not exist.')
    }

    var valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid){
        throw new Error('Invalid password!');
    }
}

async function addRoom(numberOfBeds, bedSize, roomSize, viewType, price){
    var conn = await connect();
    var roomId = 1;
    var roomExists = await conn.collection('hotelRooms').findOne({roomId});

    while (roomExists != null){
        roomId++;
        roomExists = await conn.collection('hotelRooms').findOne({roomId});
    }

    await conn.collection('hotelRooms').insertOne({roomId, numberOfBeds, bedSize, roomSize, viewType, price});
}

//login('Ahmed', "lol");