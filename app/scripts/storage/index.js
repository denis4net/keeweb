'use strict';

var Launcher = require('../comp/launcher');

var Storage = {
    file: require('./storage-file'),
    firebaseDatabase: require('./storage-firebase-db'),
    dropbox: require('./storage-dropbox'),
    webdav: require('./storage-webdav'),
    gdrive: require('./storage-gdrive'),
    onedrive: require('./storage-onedrive'),
    cache: Launcher ? require('./storage-file-cache') : require('./storage-cache')
};

module.exports = Storage;
