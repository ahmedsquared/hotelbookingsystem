var { MongoClient } = require("mongodb");

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
    filterObject = constructFilterObject(parameters);
    var results = await conn.collection('hotelRooms').find(filterObject).toArray();
    return results;
}

function constructFilterObject(parameters) {
    console.log('\nparameters:\n', JSON.stringify(parameters, null, 2));
    filterObject = {
        beds: {$in: convertBedSize(parameters.bedSize)},
        facesDirection: parameters.facesDirection === 'Any' ? {$exists: true} : parameters.facesDirection,
        hasBalcony: convertHasBalcony(parameters.hasBalcony),
    };
    console.log('\nfilterObject:\n', JSON.stringify(filterObject, null, 2));
    return filterObject;
}

/**Returns an array of acceptable bedsizes given a minimum size
 * e.g. minSize='Queen' => ['Queen', 'King']
 */
function convertBedSize(minSize) {
    var filter = [
        'Twin',
        'Double',
        'Queen',
        'King'
    ];
    return filter.slice(filter.indexOf(minSize));
}

function convertHasBalcony(hasBalcony) {
    switch (hasBalcony) {
        case ('Any'):
            return {$exists: true};
        case ('Yes'):
            return true;
        case ('No'):
            return false;
    }
}

module.exports = {
    searchRooms
}