var {MongoClient, ObjectId} = require("mongodb");
var bcrypt = require("bcrypt");
var filters = require('./filterFunctions');
var url =  'mongodb+srv://dbUser:H09gHCOOguRPlSpg@cluster0.rqwpp.mongodb.net/cps888?retryWrites=true&w=majority';
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
    console.log('Available Results:\n', availableResults.map(room => "Room " + room.roomId));
    return availableResults;
}

async function payment_info(username, owner, credit_num, csv, exp) {
    var conn = await connect();
    //Store user if exist into existingUser var
    var existingUser = await conn.collection('users').findOne({ username });
    
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

async function display_price(roomId, days, policy) {
    var conn = await connect();
    var id = parseInt(roomId);
    var room = await conn.collection('hotelRooms').findOne({ roomId: id });
    var total = room.basePrice * days * policy;
    return total.toFixed(2);
}
async function calc_subtotal(price, service) {
    var total = parseFloat(price) + parseFloat(service);
    return total.toFixed(2);
}

async function calc_tax(subtotal) {
    var tax = subtotal * 0.13;
    return tax.toFixed(2); //rounded to 2 decimals
}

async function calc_total(subtotal) {
    var total = subtotal * 1.13;
    return total.toFixed(2); //rounded to 2 decimals
}

async function calc_services(serviceId, days) {
    var conn = await connect();
    var price = 0;
    var iD = serviceId;
    for (var i=0; i<(iD.length); i++){
        var serviceId = iD[i];
        var service = await conn.collection('hotelServices').findOne({ serviceId });
        price += service.price;
    }
    var total = parseFloat(price) * parseFloat(days);
    return total.toFixed(2); //rounded to 2 decimals
}

async function enter_payment_info(username){
    var conn = await connect();
    var user = await conn.collection('users').findOne({ username });

    if (user == null) {
        throw new Error('User does not exist!');
    }
}

async function calc_days(start, end) {
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    const firstDate = new Date(start);
    const secondDate = new Date(end);

    const diffDays = Math.round(Math.abs((firstDate - secondDate) / oneDay));

    return diffDays;
}

async function check_payment_info(username, owner, credit_num, csv, exp, roomId, services, totalPrice, customer, startDate, endDate, timestamp) {
   
    var conn = await connect();
    var check_user = await conn.collection('users').findOne({username});
    var payment_processed = 0;
    var bookingId = 1;
    if (check_user.owner == null || check_user.credit_num == null || check_user.csv == null || check_user.exp == null){
        await payment_info(username, owner, credit_num, csv, exp);
    }
    var user = await conn.collection('users').findOne({username});
    console.log(owner);
    console.log(user.owner);
    if (user.owner == owner && user.credit_num == credit_num && user.csv == csv && user.exp == exp) {
        console.log('Success Payment Match!\n');
        console.log('roomId', roomId);
        console.log('services', services);
        payment_processed = 1;
        var existingBooking = await conn.collection('hotelBookings').findOne({bookingId});
        while (existingBooking != null) {
            bookingId ++;
            existingBooking = await conn.collection('hotelBookings').findOne({bookingId});
        }
        console.log('bookingId', bookingId);
        addBooking(bookingId, "Confirmed", parseInt(roomId), services, totalPrice, customer, startDate, endDate, timestamp);
    }
    else {
        payment_processed = 0;
    }
    return {status: payment_processed, bookingId: bookingId};
  
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

    while (roomExists != null){
        roomId++;
        roomExists = await conn.collection('hotelRooms').findOne({roomId});
    }
    
    await conn.collection('hotelRooms').insertOne({roomId, numBeds, bedSize, roomSize, hasBalcony, facesDirection, basePrice: Number(basePrice)});
}

async function getAllRooms(){
    var conn = await connect();
    var rooms = await conn.collection('hotelRooms').find({}).toArray();

    return rooms;
}

async function addBooking(bookingId, bookingStatus, roomId, services, totalPrice, customer, startDate, endDate, timestamp){
    var conn = await connect();
    var roomIdent = await conn.collection('hotelRooms').findOne({roomId});
    var existingBooking = await conn.collection('hotelBookings').findOne({bookingId});
    
    if (existingBooking!= null){
        throw new Error('Booking already exists.');
    }
    else if (roomIdent == null){
        throw new Error('Room does not exist.');
    }

    const startingDate = new Date(startDate);
    const endingDate = new Date(endDate);
    
    await conn.collection('hotelBookings').insertOne({bookingId, bookingStatus, room: roomIdent._id, services, totalPrice, customer, startDate: startingDate, endDate: endingDate, timestamp});


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

async function getBookingAndRoom(bookingId) {
    var conn = await connect();
    var booking = await conn.collection('hotelBookings').findOne({bookingId: parseInt(bookingId)});
    var room = await conn.collection('hotelRooms').findOne({_id: booking.room});
    return {booking, room};
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
        day = '' + (d.getDate() + 1),
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

    await conn.collection('hotelBookings').updateOne(
        {bookingId},
        {
            $set: {
                bookingStatus: 'Canceled',
            }
        }
    )
}

async function addServices(serviceId, price) {
    var conn = await connect();
    var serviceExists = await conn.collection('hotelServices').findOne({serviceId});

    if (serviceExists == null){
        await conn.collection('hotelSerrvices').insertOne({serviceId, price});
    }
    
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
    var services = await conn.collection('hotelServices').find({}).toArray();
    var service1 = await conn.collection('hotelServices').findOne({serviceId: "lateCheckout"});
    var service2 = await conn.collection('hotelServices').findOne({serviceId: "babyCrib"});
    var service3 = await conn.collection('hotelServices').findOne({serviceId: "petHotel"});
    if (service1 == null) {
        await addServices("lateCheckout", 20);
    }
    if (service2 == null) {
        await addServices("babyCrib", 15);
    }
    if (service3 == null) {
        await addServices("petHotel", 50);
    }
    return services;
}

async function adjustPricePolicy(multipliers) {
    var conn = await connect();
    
    await conn.collection('pricePolicy').updateOne(
        {policyId: 1},
        {
            $set: {
                multiplier1: multipliers.mult1,
                multiplier2: multipliers.mult2,
                multiplier3: multipliers.mult3,
            }
        }
    )
}

async function getPricePolicy() {
    var conn = await connect();
    var policyExists = await conn.collection('pricePolicy').findOne({policyId: 1});

    if (policyExists == null){
        await conn.collection('pricePolicy').insertOne({policyId: 1, multiplier1: 1.1, multiplier2: 1, multiplier3: 0.9});
    }
    var policies = await conn.collection('pricePolicy').find({}).toArray();
 
    return policies;
}

async function calc_policy(start, today) {
    var conn = await connect();
    var policies = await conn.collection('pricePolicy').findOne({policyId: 1});
    if (policies == null){
        await conn.collection('pricePolicy').insertOne({policyId: 1, multiplier1: 1.1, multiplier2: 1, multiplier3: 0.9});
    }
    policies = await conn.collection('pricePolicy').findOne({policyId: 1});
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    const firstDate = new Date(today);
    const secondDate = new Date(start);

    const days = Math.round(Math.abs((firstDate - secondDate) / oneDay));

    console.log('daysDiff', days);
    if (days > 14) {
        return policies.multiplier3;
    }
    else if (days < 15 && days > 6) {
        return policies.multiplier2;
    }
    else if (days < 7) {
        return policies.multiplier1;
    }
}

module.exports = {
    url,
    check_payment_info,
    display_price,
    calc_subtotal,
    calc_tax,
    calc_total,
    calc_services,
    calc_days,
    calc_policy,
    searchRooms,
    login,
    register,
    cancelBooking,
    getBookings,
    getAllBookings,
    getAllRooms,
    addRoom,
    getServices,
    adjustPricePolicy,
    getPricePolicy,
    getBookingAndRoom,
    formatDate
}