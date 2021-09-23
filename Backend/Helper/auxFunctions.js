// Auxiliary functions.

// Return true if it is a number, false otherwise.
let isNumber = (number) => {
    if(number === '' || number === null || number === undefined || number === NaN) return false;
    return !isNaN(number)
};

module.exports = {
    isNumber
}