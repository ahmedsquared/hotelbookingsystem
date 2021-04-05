var {MongoClient, ObjectId} = require("mongodb");
var bcrypt = require("bcrypt");
var filters = require('./filterFunctions');
var db = null;
async function connect(){
    if (db == null){
        var url = 'mongodb+srv://dbUser:H09gHCOOguRPlSpg@cluster0.rqwpp.mongodb.net/cps888?retryWrites=true&w=majority';
        var options = {
         useUnifiedTopology: true,
        }

        var connection = await MongoClient.connect(url, options);
        db = await connection.db("cps888");
    }

    return db;
}

async function searchRooms(parameters) {
    const conn = await connect();
    filterObject = filters.constructFilterObject(parameters);
    console.log('searching with the following filter object:\n', filterObject);
    const results = await conn.collection('hotelRooms').find(filterObject).toArray();
    console.log('Results:\n', results);

    //Filter out results that have booking within the given date range
    const availableResults = [];
    await Promise.all(results.map(async result => {
        const roomObj = {
            room: ObjectId(result._id),
            $and: [
                {
                    startDate: {
                        $lte: new Date(parameters.endDate)
                    }
                },
                {
                    endDate: {
                        $gte: new Date(parameters.startDate)
                    }
                }
            ]
        }
        const conflictingBooking = await conn.collection('hotelBookings').findOne(roomObj);
        if (!conflictingBooking) {
            availableResults.push(result);
        }
    }));
    console.log('Available Results:\n', availableResults);
    return availableResults;
}



module.exports = {
    searchRooms
}
async function register(username, password){
    var conn = await connect();
    var existingUser = await conn.collection('users').findOne({username});

    if (existingUser != null){
        throw new Error('User already exists.');
    }

    var SALT_ROUNDS = 10;
    var passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await conn.collection('users').insertOne({username, passwordHash});

}

async function login(username, password){
    var conn = await connect();
    var user = await conn.collection('users').findOne({username});

    if (user == null){
        throw new Error("User does not exist.");
    }

    var valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid){
        throw new Error("Invalid password.")
    }
}

async function addListItem(username, item){
    var conn = await connect();

    await conn.collection('users').updateOne(
        {username},
        {
            $push: {
                list: item,
            }
        }
    )
}

async function getListItems(username){
    var conn = await connect();
    var user = await conn.collection('users').findOne({username});

    console.log("List items:", user.list);
}

async function deleteListItems(username, item){
    var conn = await connect();
    await conn.collection('users').updateOne(
        {username},
        {
            $pull: {
                list: item,
            }
        }
    )
}


async function addRoom(roomId, numBeds, bedSize, roomSize, hasBalcony, facesDirection, maxPrice){
    var conn = await connect();
    var roomExists = await conn.collection('hotelRooms').findOne({roomId});
    var isBooked = false;

    while (roomExists != null){
        throw new Error('Room already exists.');
    }

    await conn.collection('hotelRooms').insertOne({roomId, numBeds, bedSize, roomSize, hasBalcony, facesDirection, maxPrice, isBooked});
}

async function addBooking(bookingId, bookingStatus, roomId, services, totalPrice, customer, startDate, endDate, timestamp){
    var conn = await connect();
    var roomCollection = await conn.collection('hotelRooms')
    var roomIdent = await conn.collection('hotelRooms').findOne({roomId});
    var existingBooking = await conn.collection('hotelBookings').findOne({bookingId});
    if (existingBooking!= null){
        throw new Error('Booking already exists.');
    }
    else if (roomIdent == null){
        throw new Error('Room does not exist.');
    }
    else if (roomIdent.isBooked){
        throw new Error('Room is already booked.');
    }
    roomCollection.updateOne(
        { "roomId" : roomId},
        {$set: {isBooked: true}}
    );
    
    await conn.collection('hotelBookings').insertOne({bookingId, bookingStatus, room: roomIdent._id, services, totalPrice, customer, startDate, endDate, timestamp});
}