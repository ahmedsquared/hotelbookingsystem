var filters = require('./filterFunctions');

test('Construct Filter Object', function() {
    var parameters = {};
    var expectedObject = {};
    expect(filters.constructFilterObject(parameters)).toEqual(expectedObject);

    parameters = {
        bedSize: 'Queen'
    };
    expectedObject = {
        bedSize: {$in: ['Queen', 'King']}
    };
    expect(filters.constructFilterObject(parameters)).toEqual(expectedObject);

    parameters = {
        bedSize: 'Double',
        facesDirection: 'Any'
    };
    expectedObject = {
        bedSize: {$in: ['Double', 'Queen', 'King']}
    };
    expect(filters.constructFilterObject(parameters)).toEqual(expectedObject);

    parameters = {
        bedSize: 'King',
        facesDirection: 'East',
    };
    expectedObject = {
        bedSize: {$in: ['King']},
        facesDirection: 'East'
    };
    expect(filters.constructFilterObject(parameters)).toEqual(expectedObject);
});

test('Bed Size Filter', function() {
    var result = filters.bedSizeFilter('Twin');
    var expected = {bedSize: {$in: ['Twin', 'Double', 'Queen', 'King']}};
    expect(result).toEqual(expected);
    
    result = filters.bedSizeFilter('Double');
    expected = {bedSize: {$in: ['Double', 'Queen', 'King']}};
    expect(result).toEqual(expected);
    
    result = filters.bedSizeFilter('Queen');
    expected = {bedSize: {$in: ['Queen', 'King']}};
    expect(result).toEqual(expected);
    
    result = filters.bedSizeFilter('King');
    expected = {bedSize: {$in: ['King']}};
    expect(result).toEqual(expected);
});

test('Room Size Filter', function() {
    var result = filters.roomSizeFilter('Small');
    var expected = {roomSize: {$in: ['Small', 'Medium', 'Large', 'Penthouse']}};
    expect(result).toEqual(expected);
    
    result = filters.roomSizeFilter('Medium');
    expected = {roomSize: {$in: ['Medium', 'Large', 'Penthouse']}};
    expect(result).toEqual(expected);
    
    result = filters.roomSizeFilter('Large');
    expected = {roomSize: {$in: ['Large', 'Penthouse']}};
    expect(result).toEqual(expected);
    
    result = filters.roomSizeFilter('Penthouse');
    expected = {roomSize: {$in: ['Penthouse']}};
    expect(result).toEqual(expected);
});

test('Has Balcony Filter', function() {
    expect(filters.hasBalconyFilter('Yes')).toEqual({hasBalcony: true});
    expect(filters.hasBalconyFilter('No')).toEqual({hasBalcony: false});
    expect(() => {
        filters.hasBalconyFilter('Any');
    }).toThrow();
    expect(() => {
        filters.hasBalconyFilter('Yeet');
    }).toThrow();
});

test('Faces Direction Filter', function() {
    expect(filters.facesDirectionFilter('North')).toEqual({facesDirection: 'North'});
    expect(filters.facesDirectionFilter('East')).toEqual({facesDirection: 'East'});
    expect(filters.facesDirectionFilter('South')).toEqual({facesDirection: 'South'});
    expect(filters.facesDirectionFilter('West')).toEqual({facesDirection: 'West'});
});

test('Max Price Filter', function() {
    expect(filters.maxPriceFilter(150)).toEqual({basePrice: {$lte: 150}});
    expect(filters.maxPriceFilter(200)).toEqual({basePrice: {$lte: 200}});
    expect(filters.maxPriceFilter(0)).toEqual({basePrice: {$lte: 0}});
})