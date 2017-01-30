'use strict';

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const STORE_KEY = 'firebase-db-credentials';

// https://cryptosense.com/parameter-choice-for-pbkdf2/
// https://blog.lastpass.com/2015/06/lastpass-security-notice.html
// https://pages.nist.gov/800-63-3/sp800-63b.html#sec5
const PBKDF2_OPTIONS = {
    keyBytes: 256,
    hashAlgorithm: 'SHA-512',
    iterationsCount: 100000
};

const StorageBase = require('./storage-base');
const firebase = require('firebase');
const Base64 = require('../util/base64');
const Base58 = require('base-x')(BASE58);
const SettingsStore = require('../comp/settings-store');
const TextEncoder = require('text-encoding').TextEncoder;

require('webcrypto-shim');

var FirebaseDB = StorageBase.extend({
    name: 'firebaseDatabase',
    icon: 'hdd-o',
    enabled: true,
    system: false,

    init: function () {
        StorageBase.prototype.init.apply(this, arguments);
        this._ctx = SettingsStore.load(STORE_KEY);
        this._initFirebase();
    },

    needShowOpenConfig: function () {
        return !this._ctx;
    },

    getOpenConfig: function () {
        return {
            fields: [
                { id: 'user', title: 'openUser', placeholder: 'openUserPlaceholder', type: 'text' },
                { id: 'password', title: 'openPass', placeholder: 'openPassPlaceholder', type: 'password' }
            ],
            signUp: true
        };
    },

    getPathForName: function (fileName) {
        return fileName;
    },

    _initFirebase: function (callback) {
        const config = require('../../../storage-configs/firebase');
        firebase.initializeApp(config);
    },

    _getDBRef: function (path) {
        let key = '/users/' + this._ctx.userId + (path || '');
        this.logger.debug('Accessing:', key);
        return firebase.database().ref(key);
    },

    _getFileRef: function (name) {
        return this._getDBRef('/files/' + (name || ''));
    },

    _generateUserToken: function (config) {
        return crypto.subtle.importKey(
            'raw', // only "raw" is allowed
            (new TextEncoder()).encode(config.password), // your password
            { name: 'PBKDF2' },
            false, // whether the key is extractable (i.e. can be used in exportKey)
            ['deriveBits'] // can be any combination of "deriveKey" and "deriveBits"
        ).then((key) => {
            return window.crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: (new TextEncoder()).encode(config.user),
                    iterations: PBKDF2_OPTIONS.iterationsCount,
                    hash: { name: PBKDF2_OPTIONS.hashAlgorithm }
                },
                key,
                PBKDF2_OPTIONS.keyBytes * 8
            );
        }).then((bits) => Base58.encode(new Uint8Array(bits)));
    },

    save: function (id, opts, data, callback, rev) {
        crypto.subtle.digest('SHA-256', data).then((hash) => {
            rev = rev || Base64.encode(hash);
            const stat = { rev: rev };
            this.logger.debug('Saving', id, stat);
            this._getFileRef(id).update({ data: Base64.encode(data), stat: stat })
                .then(() => callback(null, stat))
                .catch(callback);
        });
    },

    load: function (id, opts, callback) {
        this.logger.debug('Load', id);
        this._getFileRef(id).once('value')
            .then((snapshot) => {
                callback(null, Base64.decode(snapshot.child('data').val()), snapshot.child('stat').val());
            }).catch(callback);
    },

    stat: function (id, opts, callback) {
        this._getFileRef(id).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    callback(null, snapshot.child('stat').val());
                } else {
                    callback({ notFound: true, message: id + ' is not found' });
                }
            })
            .catch(callback);
    },

    list: function (callback) {
        this._getFileRef().once('value')
            .then((snapshot) => {
                let files = [];
                if (snapshot.exists()) {
                    let sFiles = snapshot.val();
                    Object.keys(sFiles).forEach((key) => {
                        files.push({ name: key, rev: sFiles[key].stat.rev, path: key });
                    });
                }
                callback(null, files, '/');
            })
            .catch(callback);
    },

    remove: function (id, opts, callback) {
        this._getFileRef(id).remove().then(callback).catch(callback);
    },

    signUp: function (config, callback) {
        this._generateUserToken(config).then(userId => {
            this._ctx = { userId: userId };

            this._getDBRef().once('value').then((s) => {
                if (s.exists()) {
                    this._ctx = null;
                    return callback('User already exists');
                }

                SettingsStore.save(STORE_KEY, this._ctx);
                return this._getDBRef().set({ registrationTime: Date.now() })
                    .then(callback)
                    .catch(callback);
            }).catch(callback);
        });
    },

    applyConfig: function (config, callback) {
        this._generateUserToken(config).then(userId => {
            this._ctx = { userId: userId };
            SettingsStore.save(STORE_KEY, this._ctx);
            this._getDBRef().once('value').then((s) => {
                let err = s.exists() ? null : 'User or password is incorrect or user doesn\'t exist';
                callback(err);
            }).catch(callback);
        });
    }
});

module.exports = new FirebaseDB();
