var {MongoClient, ObjectId} = require("mongodb");
const { registerHelper } = require("hbs");
var bcrypt = require("bcrypt");
var filters = require('./filterFunctions');
var url = 'mongodb+srv://dbUser:H09gHCOOguRPlSpg@cluster0.rqwpp.mongodb.net/cps888?retryWrites=true&w=majority';
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

async function payment_info(username, owner, credit_num, csv, exp) {
    var conn = await connect();
    //Store user if exist into existingUser var
    var existingUser = await conn.collection('users').findOne({ username });
    
        await conn.collection('users').insertOne({ username, owner, credit_num, csv, exp });
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

async function check_payment_info(username, owner, credit_num, csv, exp) {
   
    var conn = await connect();
    var user = await conn.collection('users').findOne({username});
    var payment_processed = 0;
    if (user.owner == owner && user.credit_num == credit_num && user.csv == csv && user.exp == exp) {
        console.log('Success Payment Match:\n');
        payment_processed = 1;
    }
    else {
        throw new Error("Payment Information Mismatch!");
        payment_processed = 0;
    }
    return payment_processed;
  
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

        
    if (user == null){
        throw new Error("User does not exist.");
    }

    var valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid){
        throw new Error("Invalid password.")
    }
}

async function addRoom(roomId, numBeds, bedSize, roomSize, hasBalcony, facesDirection, basePrice){

    var conn = await connect();
    var roomExists = await conn.collection('hotelRooms').findOne({roomId});

    var isBooked = false;
    while (roomExists != null){
        throw new Error('Room already exists.');
    }

    await conn.collection('hotelRooms').insertOne({roomId, numBeds, bedSize, roomSize, hasBalcony, facesDirection, basePrice, isBooked});
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


    existingBooking = await conn.collection('hotelBookings').findOne({bookingId});
    const thisbookingid = existingBooking._id;
    await conn.collection('users').updateOne(
        { username: customer },
        {
            $push: {
                bookings: thisbookingid
            }
        }
    )
}

async function getBookings(username){
    var conn = await connect();
    var user = await conn.collection('users').findOne({username});
    var arr = [];

    var room_ref = 0;
    let i;

    if (user.bookings != null){
        arr = Array.from(Array(user.bookings.length));
        for(i = 0;i < user.bookings.length;i++){
            booking_ref = user.bookings[i];
            var booking = await conn.collection('hotelBookings').findOne({_id: booking_ref});
            room_ref = booking.room;
            var room = await conn.collection('hotelRooms').findOne({_id: room_ref});
            arr[i] = booking;
            arr[i].roomId = room.roomId;
            arr[i].numBeds = room.numBeds;
            arr[i].bedSize = room.bedSize;
            arr[i].roomSize = room.roomSize;
            arr[i].hasBalcony = room.hasBalcony;
            arr[i].facesDirection = room.facesDirection;
        }
    }
    console.log(arr);
    return arr;
}

async function cancelBooking(parameter){
    var conn = await connect();
    var bookingId = parseInt(parameter);
    var booking = await conn.collection('hotelBookings').findOne({bookingId});
    console.log('Booking: ' + booking);

    await conn.collection('hotelBookings').updateOne(
        {bookingId},
        {
            $set: {
                bookingStatus: 'Canceled',
            }
        }
    )

    await conn.collection('hotelRooms').updateOne(
        {_id: booking.room},
        {
            $set: {
                isBooked: false,
            }
        }
    )
}

module.exports = {
    url,
    //add_payment_info,
    searchRooms,
    login,
    register,
    cancelBooking,
    getBookings
}

//addRoom(5, 2, "Double", "Large", "yes", "South", 900);
//addBooking(5, "Confirmed", 5, "BabyCrib", 800, "Jared", "04-02-2021", "04-05-2021", Date.now());

//add_payment_info("Sam", "Sam", 456192395487, 992, "02-20");
//payment_info("Sam", "Sam", 456192395487, 992, "02-20");


//addRoom(1, 1, "King", "Small", "yes", "North", 600);
//addRoom(2, 1, "King", "Medium", "no", "West", 800);
//addRoom(3, 1, "Queen", "Medium", "no", "West", 600);
//addRoom(4, 2, "Twin", "Medium", "yes", "East", 500);
//addRoom(5, 2, "Double", "Large", "yes", "South", 900);

//addBooking(1, "Confirmed", 2, "LateCheckout", 1000, "Jared", new Date("2021-04-02"), new Date("2021-04-05"), Date.now());
//addBooking(2, "Confirmed", 3, "PetHotel", 900, "Jared", new Date("2021-04-07"), new Date("2021-04-10"), Date.now());
//addBooking(3, "Confirmed", 1, "PetHotel", 800, "Colin", new Date("2021-04-07"), new Date("2021-04-10"), Date.now());
//addBooking(4, "Confirmed", 2, "BabyCrib", 800, "Colin", new Date("2021-02-02"), new Date("2021-04-05"), Date.now());
