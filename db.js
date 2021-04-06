var { MongoClient } = require("mongodb");
var bcrypt = require('bcrypt');
var url = 'mongodb+srv://dbUser:Wf81kH5ELPmpAo1u@cluster0.gnrno.mongodb.net/cps888?retryWrites=true&w=majority';

var db = null;
async function connect(){
    if(db == null){
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
    var bookedRooms = [];
    var existingUser = await conn.collection('customers').findOne({username});

    if (existingUser != null){
        throw new Error('User already exists!')
    }

    var SALT_ROUNDS = 10;
    var passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await conn.collection('customers').insertOne({username, passwordHash, bookedRooms});
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

async function addRoom(roomId, numberOfBeds, bedSize, roomSize, viewType, price){
    var conn = await connect();
    var roomExists = await conn.collection('hotelRooms').findOne({roomId});
    var isBooked = false;

    while (roomExists != null){
        throw new Error('Room already exists.');
    }

    await conn.collection('hotelRooms').insertOne({roomId, numberOfBeds, bedSize, roomSize, viewType, price, isBooked});
}

async function getCustomerRooms(username){
    var conn = await connect();
    var user = await conn.collection('customers').findOne({username});
    var roomArr = [];
    var roomId = 0;

    let i;
    for(i = 0;i < user.bookedRooms.length;i++){
        roomId = user.bookedRooms[i];
        var room = await conn.collection('hotelRooms').findOne({roomId});
        roomArr.push(room);
    }
    
    return roomArr;
}

async function cancelBooking(username, roomId){
    var conn = await connect();
    var user = await conn.collection('customers').findOne({username});
    var room = await conn.collection('hotelRooms').findOne({roomId});
    var newBookedRooms = user.bookedRooms;

    roomId = parseInt(roomId, 10);

    await conn.collection('hotelRooms').updateOne(
        {roomId},
        {
            $set: {
                isBooked: false,
            }
        }
    )

    let i;
    for(i=0;i<newBookedRooms.length;i++){
        if(newBookedRooms[i] === roomId){
            newBookedRooms.splice(i, 1);
            break;
        }
    }

    await conn.collection('customers').updateOne(
        {username},
        {
            $set: {
                bookedRooms: newBookedRooms,
            }
        }
    )
}

module.exports = {
    url,
    login,
    register,
    getCustomerRooms,
    cancelBooking,
};

//login('Ahmed', "lol");