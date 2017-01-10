'use strict';

var StorageBase = require('./storage-base');
var firebase = require('firebase');

var FirebaseDB = StorageBase.extend({
    name: 'firebaseDatabase',
    icon: 'hdd-o',
    enabled: true,
    system: false,

    init: function() {
        StorageBase.prototype.init.apply(this, arguments);
        this._initFirebase();
    },

    needShowOpenConfig: function() {
        return true;
    },

    getOpenConfig: function() {
        return {
            fields: [
                {id: 'user', title: 'openUser', placeholder: 'openUserPlaceholder', type: 'text'},
                {id: 'password', title: 'openPass', placeholder: 'openPassPlaceholder', type: 'password'}
            ]
        };
    },

    getPathForName: function(fileName) {
        return '/' + fileName + '.kdbx';
    },

    _initFirebase: function() {
        var config = {
            apiKey: 'AIzaSyCucr_UConEa3jrPcxixIs12MWa_OXMfs4',
            authDomain: 'savekee.firebaseapp.com',
            databaseURL: 'https://savekee.firebaseio.com',
            storageBucket: 'savekee.appspot.com',
            messagingSenderId: '1044618834879'
        };
        firebase.initializeApp(config);
    },

    _getDB: function(opts) {
        //  var auth = firebase.auth();
        return firebase.database().ref('/users/' + opts.user + '/kdbx/');
    },

    save: function(id, opts, data, callback) {
        this.logger.debug('Save', id);
        var db = this._getDB(opts);
        db.set({data: data}).then((snapshot) => {
            if (callback) callback(null, {});
        });
    },

    load: function(id, opts, callback) {
        this.logger.debug('Load', id);
        var db = this._getDB(opts);
        db.once('value').then((snapshot) => {
            if (callback) callback(null, snapshot.data, {});
        });
    },

    stat: function(id, opts, callback) {
        this.logger.debug('Stat', arguments);
        var db = this._getDB(opts);
        db.once('value').then((snapshot) => {
            if (callback) callback(null, {});
        });
    },

    remove: function(id, opts, callback) {
        this.logger.debug('Remove', id);
    },

    applyConfig: function(config, callback) {
        return callback && callback(null);
    }
});

module.exports = new FirebaseDB();
