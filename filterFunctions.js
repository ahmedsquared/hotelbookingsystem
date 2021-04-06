const functionMap = {
    'numBeds': null,
    'bedSize': bedSizeFilter,
    'roomSize': roomSizeFilter,
    'hasBalcony': hasBalconyFilter,
    'facesDirection': facesDirectionFilter,
    'maxPrice': maxPriceFilter,
    'startDate': null,
    'endDate': null
}

/**
 * Converts the filter parameters into an object parseable by MongoDB
 * Iterates through each key in the parameter object, if there is a corresponding function for a given key, it adds that function's return value to the filter object
 * @param {*} parameters 
 * @returns MongoDB filter object representing the given parameters
 */
function constructFilterObject(parameters) {
    var filterObject = {};
    Object.keys(parameters).forEach(parameterKey => {
        var filterFunction = functionMap[parameterKey];
        var filterValue = parameters[parameterKey];
        if (!!filterValue && filterValue.toLowerCase() !== 'any' && typeof filterFunction === 'function') {
            filterObject = {
                ...filterObject,
                ...filterFunction(filterValue)
            };
        }
    });
    console.log('FilterObject:\n', filterObject);
    return filterObject;
}

/**
 * 
 * @param {*} minSize 
 * @returns Array of acceptable bed sizes given a minimum size
 * e.g. Queen => ['Queen', 'King']
 * e.g. Double => ['Double', 'Queen', 'King']
 */
 function bedSizeFilter(minSize) {
    var filter = [
        'Twin',
        'Double',
        'Queen',
        'King'
    ];
    filter = filter.slice(filter.indexOf(minSize));
    return {bedSize: {$in: filter}};
}

/**
 * 
 * @param {*} minSize 
 * @returns Array of acceptable room sizes given a minimum size
 * e.g. Large => ['Large', 'Penthouse']
 * e.g. Medium => ['Medium', 'Large', 'Penthouse']
 */
function roomSizeFilter(roomSize) {
    var filter = [
        'Small',
        'Medium',
        'Large',
        'Penthouse'
    ];
    filter = filter.slice(filter.indexOf(roomSize));
    return {roomSize: {$in: filter}};
}

function hasBalconyFilter(hasBalcony) {
    switch (hasBalcony.toLowerCase()) {
        case ('yes'):
            return {hasBalcony: true};
        case ('no'):
            return {hasBalcony: false};
        default:
            throw new Error('hasBalconyFilter can only parse "Yes" or "No"');
    }
}

function facesDirectionFilter(value) {
    return {facesDirection: value};
}

function maxPriceFilter(maxPrice) {
    return {basePrice: {$lte: Number(maxPrice)}}
}

module.exports = {
    functionMap,
    constructFilterObject
}

if (process.env.TEST) {
    module.exports = {
        ...module.exports,
        bedSizeFilter,
        roomSizeFilter,
        hasBalconyFilter,
        facesDirectionFilter,
        maxPriceFilter,
    }
}