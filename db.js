var {MongoClient, ObjectId} = require("mongodb");
const { registerHelper } = require("hbs");
var filters = require('./filterFunctions');
var url = 'mongodb+srv://coliwong:3Vh0IaUalo9V0YRC@cluster0.u1riz.mongodb.net/cps888?retryWrites=true&w=majority';
var { MongoClient } = require("mongodb");

var db = null;
async function connect(){
    if(db == null){
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

async function payment_info(username) {
    var conn = await connect();
    //Store user if exist into existingUser var
    var existingUser = await conn.collection('users').findOne({ username });
    
        await conn.collection('users').insertOne({ username });
    if(existingUser == null) {
    }
}

async function enter_payment_info(username){
    var conn = await connect();
    var user = await conn.collection('users').findOne({ username });

    if (user == null) {
        throw new Error('User does not exist!');
    }
}

async function add_payment_info(username, credit_num, csv) {
    var conn = await connect();

    await conn.collection('users').updateOne(
        { username },
        {
            $push: {
                list: {
                    $each: [credit_num, csv]
                }

            }
        }
    )
}

async function getListItems(username) {
    var conn = await connect();
    var user = await conn.collection('users').findOne({ username });

    console.log("List items: ", user.list);
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

        throw new Error("User does not exist.");
    if (user == null){
    }

    var valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid){
        throw new Error("Invalid password.")
    }
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

module.exports = {
    url,
    add_payment_info,
    searchRooms,
    login,
    getCustomerRooms,
    cancelBooking
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