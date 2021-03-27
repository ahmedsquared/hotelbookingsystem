var { MongoClient } = require("mongodb");
var filters = require('./filterFunctions');

var db = null;
async function connect(){
    if(db == null){
        var url = 'mongodb+srv://dbUser:Wf81kH5ELPmpAo1u@cluster0.gnrno.mongodb.net/cps888?retryWrites=true&w=majority';
        var options = {
            useUnifiedTopology: true,
        };

        var connection = await MongoClient.connect(url, options);
        db = connection.db("cps888");
    }
    
    return db;
}

async function searchRooms(parameters) {
    var conn = await connect();
    filterObject = filters.constructFilterObject(parameters);
    console.log('searching with the following filter object:\n', filterObject);
    var results = await conn.collection('hotelRooms').find(filterObject).toArray();
    return results;
}



module.exports = {
    searchRooms
}