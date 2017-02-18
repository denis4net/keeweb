module.exports = {
    encode: function (arrayBuffer) {
        return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)));
    },
    decode: function(string) {
        return Uint8Array.from(atob(string), c => c.charCodeAt(0)).buffer;
    }
};
