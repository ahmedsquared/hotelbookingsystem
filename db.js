var {MongoClient, ObjectId} = require("mongodb");
const { registerHelper } = require("hbs");
var bcrypt = require("bcrypt");
var filters = require('./filterFunctions');
var url = 'mongodb+srv://coliwong:3Vh0IaUalo9V0YRC@cluster0.u1riz.mongodb.net/cps888?retryWrites=true&w=majority';
var { MongoClient } = require("mongodb");
const { RequestHeaderFieldsTooLarge } = require("http-errors");

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
                {bookingStatus: {$ne: 'Canceled'}},
                {bookingStatus: {$ne: 'Cancelled'}},
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
    
        //await conn.collection('users').insertOne({ username, owner, credit_num, csv, exp });
    if(existingUser == null) {
        await conn.collection('users').insertOne({ username, owner, credit_num, csv, exp });
    }
    else {
        await conn.collection('users').updateOne(
            {username},
            {
                $set: {
                    owner, credit_num, csv, exp 
                }
            }
        )
    }
}

async function display_price(roomId) {
    var conn = await connect();
    var room = await conn.collection('hotelRooms').findOne({ roomId });
    //maxPrice = room.maxPrice * multiplier
    return room.maxPrice;
}

async function calc_tax(subtotal) {
    var tax = subtotal * 0.13;
    return tax.toFixed(2); //rounded to 2 decimals
}

async function calc_total(subtotal) {
    var total = subtotal * 1.13;
    return total.toFixed(2); //rounded to 2 decimals
}

async function calc_services(serviceId) {
    var price = 0;
    for (var i=0; i<(serviceId.length); i++){
        var id = serviceId[i];
        var service = await conn.collection('hotelServices').findOne({ id });
        price += service.price;
    }
    return price.toFixed(2); //rounded to 2 decimals
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
        payment_processed = 0;
        throw new Error("Payment Information Mismatch!");
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

async function addRoom(numBeds, bedSize, roomSize, hasBalcony, facesDirection, basePrice){
    var conn = await connect();
    var roomId = 1;
    var roomExists = await conn.collection('hotelRooms').findOne({roomId});
    var isBooked = false;

    while (roomExists != null){
        roomId++;
        roomExists = await conn.collection('hotelRooms').findOne({roomId});
    }
    
    await conn.collection('hotelRooms').insertOne({roomId, numBeds, bedSize, roomSize, hasBalcony, facesDirection, basePrice, isBooked});
}

async function getAllRooms(){
    var conn = await connect();
    var room = await conn.collection('hotelRooms').findOne({ roomId: 1 });
    
    var arr = [];
    let i = 0;

    while (room != null){
        arr[i] = room;
        var num = i + 2;
        room = await conn.collection('hotelRooms').findOne({ roomId: num });
        i++;
    }
    return arr;
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
        for(i = 0; i < user.bookings.length; i++){
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
            arr[i].startDate = formatDate(arr[i].startDate);
            arr[i].endDate = formatDate(arr[i].endDate);
        }
    }
    return arr;
}

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return [year, month, day].join('-');
}

async function getAllBookings(){
    var conn = await connect();
    var booking = await conn.collection('hotelBookings').findOne({ bookingId: 1 });
    
    var arr = [];

    var room_ref = 0;
    let i = 0;

    while (booking != null){
        room_ref = booking.room;
        var room = await conn.collection('hotelRooms').findOne({_id: room_ref});
        arr[i] = booking;
        arr[i].roomId = room.roomId;
        arr[i].numBeds = room.numBeds;
        arr[i].bedSize = room.bedSize;
        arr[i].roomSize = room.roomSize;
        arr[i].hasBalcony = room.hasBalcony;
        arr[i].facesDirection = room.facesDirection;
        arr[i].startDate = formatDate(arr[i].startDate);
        arr[i].endDate = formatDate(arr[i].endDate);

        var num = i + 2;
        booking = await conn.collection('hotelBookings').findOne({ bookingId: num });
        i++;
    }
    return arr;
}

async function cancelBooking(parameter){
    var conn = await connect();
    var bookingId = parseInt(parameter);
    var booking = await conn.collection('hotelBookings').findOne({bookingId});

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

async function addServices(serviceId, price) {
    var conn = await connect();
    var serviceExists = await conn.collection('hotelServices').findOne({serviceId});

    if (serviceExists == null){
        await conn.collection('hotelServices').insertOne({serviceId, price});
    }
    
}

async function getServices() {
    var conn = await connect();
    var services = conn.collection('hotelServices').find({}).toArray();
    return services;
}

module.exports = {
    url,
    check_payment_info,
    display_price,
    calc_tax,
    calc_total,
    calc_services,
    searchRooms,
    login,
    register,
    cancelBooking,
    getBookings,
    getAllBookings,
    getAllRooms,
    addRoom,
    getServices
}

//addServices("lateCheckout", 20);
//addServices("babyCrib", 15);
//addServices("petHotel", 50);
//addRoom(5, 2, "Double", "Large", "yes", "South", 900);
//addBooking(5, "Confirmed", 5, "BabyCrib", 800, "Jared", "04-02-2021", "04-05-2021", Date.now());

//add_payment_info("Sam", "Sam", 456192395487, 992, "02-20");
//payment_info("Sam", "Sam", 456192395487, 992, "02-20");


//addRoom(1, "King", "Small", "yes", "North", 600);
//addRoom(2, 1, "King", "Medium", "no", "West", 800);
//addRoom(3, 1, "Queen", "Medium", "no", "West", 600);
//addRoom(4, 2, "Twin", "Medium", "yes", "East", 500);
//addRoom(5, 2, "Double", "Large", "yes", "South", 900);

//addBooking(1, "Confirmed", 2, "LateCheckout", 1000, "Jared", new Date("2021-04-02"), new Date("2021-04-05"), Date.now());
//addBooking(2, "Confirmed", 3, "PetHotel", 900, "Jared", new Date("2021-04-07"), new Date("2021-04-10"), Date.now());
//addBooking(3, "Confirmed", 1, "PetHotel", 800, "Colin", new Date("2021-04-07"), new Date("2021-04-10"), Date.now());
//addBooking(4, "Confirmed", 2, "BabyCrib", 800, "Colin", new Date("2021-02-02"), new Date("2021-04-05"), Date.now());
